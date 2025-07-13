import axios from 'axios';
import { getBackendUrl } from './utils/config';

// Get dynamic backend URL
const getApiBaseUrl = () => {
  // Check if running in development mode with Vite proxy
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // In production or when ARXIVIEW_BACKEND_URL is set, use direct backend URL
  const backendUrl = window.ARXIVIEW_BACKEND_URL || getBackendUrl();
  return backendUrl;
};

const api = axios.create();

// Update axios instance base URL
export const updateApiConfig = () => {
  const baseURL = getApiBaseUrl();
  api.defaults.baseURL = baseURL;
  console.log(`API configured to use: ${baseURL}`);
};

// Initialize API configuration
updateApiConfig();

export const getTopics = async () => {
  const response = await api.get('/topics');
  return response.data;
};

export const getPapers = async (topicName) => {
  const response = await api.get(`/papers/${encodeURIComponent(topicName)}`);
  return response.data;
};

export const getPaperSummary = async (topicName, paperId) => {
  try {
    const response = await api.get(`/paper-summary/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`);
    return response.data.summary;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const chatWithGemini = async (topicName, paperId, history) => {
  const response = await api.post(`/chat/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`, { history });
  return response.data;
};

export default api;