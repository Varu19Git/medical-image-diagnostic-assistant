import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling errors and redirects
api.interceptors.response.use(
  (response) => {
    // Handle redirects
    if (response.status === 307 || response.status === 308) {
      const originalRequest = response.config;
      return api(originalRequest);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle authentication errors (401 Unauthorized)
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      // Handle redirects in error responses
      if (error.response.status === 307 || error.response.status === 308) {
        const originalRequest = error.config;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: response.data.user_id,
        username: response.data.username,
        role: response.data.role,
        full_name: response.data.full_name
      }));
    }
    
    return response;
  },
  
  getCurrentUser: () => api.get('/auth/me'),
  
  verifyToken: async () => {
    try {
      const response = await api.post('/auth/verify-token');
      return { valid: true, user: response.data };
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { valid: false, error };
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

// Prediction services
export const predictionService = {
  getPredictions: (limit = 5) => api.get(`/predictions/?limit=${Number(limit)}`),
  getPrediction: (id) => api.get(`/predictions/${id}`),
  createPrediction: (data) => api.post('/predictions/', data),
};

// Image services
export const imageService = {
  getImages: (limit = 1) => api.get(`/images/?limit=${Number(limit)}`),
  getImage: (id) => api.get(`/images/${id}`),
  uploadImage: (formData) => api.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Feedback services
export const feedbackService = {
  getFeedback: (id) => api.get(`/feedback/${id}`),
  createFeedback: (data) => api.post('/feedback/', data),
  updateFeedback: (id, data) => api.put(`/feedback/${id}`, data),
  deleteFeedback: (id) => api.delete(`/feedback/${id}`),
};

// Report services
export const reportService = {
  getReports: (limit = 5) => api.get(`/reports/?limit=${Number(limit)}`),
  getReport: (id) => api.get(`/reports/${id}`),
  createReport: (data) => api.post('/reports/', data),
};

// User services
export const userService = {
  getUsers: (limit = 10) => api.get(`/users/?limit=${limit}`),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users/', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export default api;
