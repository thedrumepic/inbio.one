const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
      });
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchWithRetry(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    throw new Error('Сессия истекла');
  }

  return response;
};

export const api = {
  // Auth
  register: (data) => fetchWithRetry(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  login: (data) => fetchWithRetry(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  checkUsername: (username) => fetchWithRetry(`${API_URL}/auth/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  }),
  
  changePassword: (data) => fetchWithAuth(`${API_URL}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Pages
  getPages: () => fetchWithAuth(`${API_URL}/pages`),
  
  createPage: (data) => fetchWithAuth(`${API_URL}/pages`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getPageByUsername: (username) => fetchWithRetry(`${API_URL}/pages/${username}`),
  
  updatePage: (pageId, data) => fetchWithAuth(`${API_URL}/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  deletePage: (pageId) => fetchWithAuth(`${API_URL}/pages/${pageId}`, {
    method: 'DELETE',
  }),
  
  // Blocks
  createBlock: (data) => fetchWithAuth(`${API_URL}/blocks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateBlock: (blockId, data) => fetchWithAuth(`${API_URL}/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  deleteBlock: (blockId) => fetchWithAuth(`${API_URL}/blocks/${blockId}`, {
    method: 'DELETE',
  }),
  
  // Events
  createEvent: (data) => fetchWithAuth(`${API_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateEvent: (eventId, data) => fetchWithAuth(`${API_URL}/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  deleteEvent: (eventId) => fetchWithAuth(`${API_URL}/events/${eventId}`, {
    method: 'DELETE',
  }),
  
  // Showcases
  createShowcase: (data) => fetchWithAuth(`${API_URL}/showcases`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateShowcase: (showcaseId, data) => fetchWithAuth(`${API_URL}/showcases/${showcaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  deleteShowcase: (showcaseId) => fetchWithAuth(`${API_URL}/showcases/${showcaseId}`, {
    method: 'DELETE',
  }),
  
  // Music
  resolveMusic: (data) => fetchWithRetry(`${API_URL}/music/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Upload
  uploadImage: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (response.status === 401) {
      logout();
      throw new Error('Сессия истекла');
    }
    
    return response;
  },
};