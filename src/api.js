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

export const getPaperHighlights = async (topicName, paperId) => {
  try {
    const response = await api.get(`/paper-highlights/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`);
    return response.data.highlights || [];
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const savePaperHighlights = async (topicName, paperId, highlights) => {
  const response = await api.put(`/paper-highlights/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`, {
    highlights
  });
  return response.data.highlights || [];
};

export const getRuntimeConfig = async () => {
  const response = await api.get('/server-info');
  return response.data;
};

export const chatWithPaper = async (topicName, paperId, history, engine) => {
  const baseURL = api.defaults.baseURL || '';
  const url = `${baseURL}/chat/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history, engine })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error from server:', errorData);
    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
  }

  return response;
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
  const cleanedKeyword = keyword
    .replace(/[^a-zA-Z0-9\.\uAC00-\uD7A3\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const params = new URLSearchParams({
    keyword: cleanedKeyword,
    count: count.toString(),
    sort
  });

  if (year) {
    params.append('year', year);
  }

  console.log(params.toString());
  const response = await api.get(`/search?${params.toString()}`);
  return response.data;
};

export const fetchArxivPaperById = async (arxivId) => {
  const response = await api.get(`/arxiv-paper/${encodeURIComponent(arxivId.trim())}`);
  return response.data;
};

export const savePaperToTopic = async (topicName, paper) => {
  const response = await api.post(`/papers/${encodeURIComponent(topicName)}`, { paper });
  return response.data;
};

export const generatePaperSummary = async (topicName, paper, engine) => {
  const baseURL = api.defaults.baseURL || '';
  const url = `${baseURL}/summarize-and-save`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paper,
      topicName,
      engine
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error from server:', errorData);
    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
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

export const updateCitationCount = async (topicName, paperId, citation) => {
  const response = await api.post(`/papers/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}/citation`, { citation });
  return response.data;
};

export const fetchAndUpdateCitation = async (topicName, paperId) => {
  const response = await api.get(`/papers/${encodeURIComponent(topicName)}/${encodeURIComponent(paperId)}/update-citation`);
  return response.data;
};


export const translateText = async (text, engine) => {
  const response = await api.post('/translate', { text, engine });
  return response.data.translatedText;
};

export const extractPdfTextFromFile = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  const response = await api.post('/extract-pdf-text', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.text;
};

export const summarizePdfText = async (text, topicName, engine) => {
  const baseURL = api.defaults.baseURL || '';
  const url = `${baseURL}/summarize-pdf-text`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, topicName, engine })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error from server:', errorData);
    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
  }

  return response;
};

export const savePdfPaper = async (paper, summary, topicName, text) => {
  const response = await api.post('/save-pdf-paper', { paper, summary, topicName, text });
  return response.data;
};

export default api;
