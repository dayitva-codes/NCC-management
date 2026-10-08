import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      if (getToken()) {
        try {
          const me = await api.me();
          if (mounted) setUser(me);
        } catch {
          setToken(null);
        }
        if (mounted) setLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase session timeout')), 1500)
        );
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!error && data?.session) {
          await exchangeSupabaseSession(data.session);
        }
      } catch {
        // Fall back gracefully to avoid blocking page interactive load
      }
      if (mounted) setLoading(false);
    }

    function handleAuthChange(_event, session) {
      if (session && !getToken()) {
        exchangeSupabaseSession(session).catch(() => {
          if (mounted) setLoading(false);
        });
      }
    }

    function exchangeSupabaseSession(session) {
      return api.loginWithSupabase(session.access_token)
        .then(({ access_token }) => {
          setToken(access_token);
          return api.me();
        })
        .then(me => {
          if (mounted) setUser(me);
        });
    }

    restoreSession().catch(() => {
      setToken(null);
      if (mounted) setLoading(false);
    });

    const subscription = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(handleAuthChange).data.subscription
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
    if (isSupabaseConfigured) supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      googleLogin: () => {
        if (!supabase) throw new Error('Google sign-in is not configured yet.');
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
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
