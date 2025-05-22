import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check if user is already logged in (on app load)
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token is valid
          const response = await axios.get('/api/auth/me');
          
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth token validation failed:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username, password) => {
    setIsLoading(true);
    setAuthError(null);
    let errorMessage = null; // Local variable to avoid state interference

    try {
      // Using URLSearchParams to match FastAPI's expected form data format
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await axios.post('/api/auth/token', formData);
      const { access_token, user_id, username: userName, role } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', access_token);
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user data
      setUser({ id: user_id, username: userName, role });
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Handle specific error messages from the backend
      if (error.response && error.response.data) {
        errorMessage = error.response.data.detail || 'Login failed';
      } else {
        errorMessage = 'Network error. Please try again.';
      }

      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
  };

  // Value object to be provided by the context
  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
