import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        forgotPassword: resolve(import.meta.dirname, 'forgot-password.html'),
        resetPassword: resolve(import.meta.dirname, 'reset-password.html'),
        verifyLogin: resolve(import.meta.dirname, 'verify-login.html'),
        verifySession: resolve(import.meta.dirname, 'verify-session.html'),
        loginHistory: resolve(import.meta.dirname, 'login-history.html'),
        activeSessions: resolve(import.meta.dirname, 'active-sessions.html'),
        changePassword: resolve(import.meta.dirname, 'change-password.html'),
        notificationPreferences: resolve(import.meta.dirname, 'notification-preferences.html'),
      },
    },
  },
});





