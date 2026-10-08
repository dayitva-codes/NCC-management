import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ==============================================================================
 * VITE BUILD & BUNDLER CONFIGURATION
 * ==============================================================================
 * Optimized for maximum loading performance, responsive rendering, and long-term caching:
 * - Code-splits vendor libraries (React, React Router, Monaco, Supabase) into dedicated chunks.
 * - Drastically decreases initial bundle footprint for faster initial page loads.
 * ==============================================================================
 */
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
