import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }

      // Return formatted error
      return Promise.reject({
        status,
        message: data.error || data.message || 'An error occurred',
        details: data.details
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        status: 0,
        message: 'No response from server. Please check your connection.',
        details: error.message
      });
    } else {
      // Something else happened
      return Promise.reject({
        status: 0,
        message: error.message || 'An unexpected error occurred',
        details: error
      });
    }
  }
);

// API Methods
export const apiService = {
  // Auth
  auth: {
    register: (email, password, username) =>
      api.post('/auth/register', { email, password, username }),
    login: (email, password) =>
      api.post('/auth/login', { email, password }),
    me: () =>
      api.get('/auth/me'),
    changePassword: (oldPassword, newPassword) =>
      api.post('/auth/change-password', { oldPassword, newPassword })
  },

  // Projects
  projects: {
    list: () =>
      api.get('/projects'),
    get: (id) =>
      api.get(`/projects/${id}`),
    create: (name, description, settings) =>
      api.post('/projects', { name, description, settings }),
    update: (id, data) =>
      api.put(`/projects/${id}`, data),
    delete: (id) =>
      api.delete(`/projects/${id}`)
  },

  // Files
  files: {
    list: (projectId, asTree = false) =>
      api.get(`/files/${projectId}`, { params: { tree: asTree } }),
    get: (projectId, path) =>
      api.get(`/files/${projectId}/${path}`),
    update: (projectId, path, content, language) =>
      api.post('/files/update', { projectId, path, content, language }),
    batch: (projectId, files) =>
      api.post('/files/batch', { projectId, files }),
    delete: (projectId, path) =>
      api.delete(`/files/${projectId}/${path}`),
    rename: (projectId, oldPath, newPath) =>
      api.post('/files/rename', { projectId, oldPath, newPath }),
    search: (projectId, query, limit) =>
      api.post('/files/search', { projectId, query, limit })
  },

  // Chat
  chat: {
    send: (projectId, message, context = 'relevant', mode = 'chat') =>
      api.post('/chat/send', { projectId, message, context, mode }),
    history: (projectId, limit = 50, offset = 0) =>
      api.get(`/chat/history/${projectId}`, { params: { limit, offset } }),
    deleteSession: (sessionId) =>
      api.delete(`/chat/session/${sessionId}`)
  }
};

export default api;
