import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      
      if (base44.auth.isLoggedIn()) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      
      if (error.message === 'Not authenticated') {
        setAuthError({
          type: 'auth_required',
          message: 'Bitte melden Sie sich an'
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      const loggedInUser = await base44.auth.login(email, password);
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return loggedInUser;
    } catch (error) {
      setAuthError({
        type: 'login_failed',
        message: error.message || 'Anmeldung fehlgeschlagen'
      });
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const newUser = await base44.auth.register(data);
      setUser(newUser);
      setIsAuthenticated(true);
      setAuthError(null);
      return newUser;
    } catch (error) {
      setAuthError({
        type: 'register_failed',
        message: error.message || 'Registrierung fehlgeschlagen'
      });
      throw error;
    }
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    // In standalone mode, we don't redirect, just show login form
    setAuthError({
      type: 'auth_required',
      message: 'Bitte melden Sie sich an'
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      login,
      register,
      logout,
      navigateToLogin,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
