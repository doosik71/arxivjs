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

export const createTopic = async (topicName) => {
  const response = await api.post('/topics', { topicName });
  return response.data;
};

export const deleteTopic = async (topicName) => {
  const response = await api.delete(`/topics/${encodeURIComponent(topicName)}`);
  return response.data;
};

export const searchArxivPapers = async (keyword, year, count = 100, sort = 'relevance') => {
  const params = new URLSearchParams({
    keyword,
    count: count.toString(),
    sort
  });
  
  if (year) {
    params.append('year', year);
  }
  
  const response = await api.get(`/search?${params.toString()}`);
  return response.data;
};

export const savePaperToTopic = async (topicName, paper) => {
  const response = await api.post(`/papers/${encodeURIComponent(topicName)}`, { paper });
  return response.data;
};

export const generatePaperSummary = async (topicName, paper) => {
  const baseURL = api.defaults.baseURL || '';
  const url = `${baseURL}/summarize-and-save`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      paper, 
      topicName 
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
};

export const deletePaper = async (topicName, paperId) => {
  const response = await api.delete(`/papers/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`);
  return response.data;
};

export const deletePaperSummary = async (topicName, paperId) => {
  const response = await api.delete(`/paper-summary/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`);
  return response.data;
};

export default api;