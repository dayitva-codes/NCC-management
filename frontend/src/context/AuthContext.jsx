import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function exchangeSupabaseSession(session) {
      if (!session?.access_token) return;
      try {
        const { access_token } = await api.loginWithSupabase(session.access_token);
        setToken(access_token);
        const me = await api.me();
        if (mounted) {
          setUser(me);
        }
      } catch (err) {
        console.error('Supabase session exchange note:', err);
        setToken(null);
        if (mounted) setUser(null);
      }
    }

    async function restoreSession() {
      // 1. Try restoring existing CADET-360 JWT token
      if (getToken()) {
        try {
          const me = await api.me();
          if (mounted) {
            setUser(me);
            setLoading(false);
          }
          return;
        } catch {
          setToken(null);
        }
      }

      // 2. Check for active Supabase OAuth session (Google login redirect)
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data?.session) {
            await exchangeSupabaseSession(data.session);
          }
        } catch (err) {
          console.warn('Supabase session restore note:', err);
        }
      }

      if (mounted) setLoading(false);
    }

    restoreSession();

    // 3. Listen to Supabase Auth State changes (OAuth redirects & sign-in triggers)
    const subscription = isSupabaseConfigured && supabase
      ? supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
            await exchangeSupabaseSession(session);
            if (mounted) setLoading(false);
          } else if (event === 'SIGNED_OUT') {
            setToken(null);
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
          }
        }).data?.subscription
      : null;

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    const me = await api.me();
    setUser(me);
    return me;
  }

  function logout() {
    setToken(null);
    setUser(null);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      googleLogin: () => {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Google sign-in is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment settings.');
        }
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/login',
          },
        });
      },
      googleEnabled: isSupabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
