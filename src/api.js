import axios from 'axios';

const getApiBaseUrl = () => {
  // In development, always use the relative path to the API proxy.
  // Vite's proxy will handle forwarding the request to the correct backend.
  if (import.meta.env.DEV) {
    return '/api';
  }
  // In production, the client is served from the same host as the server,
  // so relative paths work there too. If you were to host them separately,
  // you would need to configure this, e.g., via an environment variable.
  return '';
};

const api = axios.create({
  baseURL: getApiBaseUrl()
});

// console.log(`API configured to use base URL: ${api.defaults.baseURL}`);

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

export const movePaper = async (sourceTopic, targetTopic, paperId) => {
  const response = await api.put(`/papers/${encodeURIComponent(sourceTopic)}/${encodeURIComponent(paperId)}`, {
    newTopicName: targetTopic
  });
  return response.data;
};

export default api;