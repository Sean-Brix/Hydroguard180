// API Configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

// Helper function to get auth token
const getAuthToken = () => {
  const token = localStorage.getItem('hydroguard_token');
  return token;
};

// Helper function to handle API errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
};

// Authentication
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  getCurrentUser: async () => {
    return fetchWithAuth('/auth/me');
  },

  logout: async () => {
    return fetchWithAuth('/auth/logout', { method: 'POST' });
  },
};

// Users
export const usersAPI = {
  getAll: async () => {
    return fetchWithAuth('/users');
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/users/${id}`);
  },

  create: async (userData: any) => {
    return fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  update: async (id: string, userData: any) => {
    return fetchWithAuth(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Residents
export const residentsAPI = {
  getAll: async () => {
    return fetchWithAuth('/residents');
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/residents/${id}`);
  },

  create: async (residentData: any) => {
    return fetchWithAuth('/residents', {
      method: 'POST',
      body: JSON.stringify(residentData),
    });
  },

  update: async (id: string, residentData: any) => {
    return fetchWithAuth(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(residentData),
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/residents/${id}`, {
      method: 'DELETE',
    });
  },
};

// Alert Levels
export const alertLevelsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/alert-levels`);
    return handleResponse(response);
  },

  getByLevel: async (level: number) => {
    const response = await fetch(`${API_BASE_URL}/alert-levels/${level}`);
    return handleResponse(response);
  },

  getCurrent: async () => {
    const response = await fetch(`${API_BASE_URL}/alert-levels/current`);
    return handleResponse(response);
  },

  update: async (level: number, data: any) => {
    return fetchWithAuth(`/alert-levels/${level}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  recalculate: async () => {
    return fetchWithAuth(`/alert-levels/recalculate`, {
      method: 'POST',
    });
  },
};

// Water Monitoring
export const waterMonitoringAPI = {
  getAll: async (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    return fetchWithAuth(`/water-monitoring?${queryParams.toString()}`);
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/water-monitoring/${id}`);
  },

  getLatest: async () => {
    const response = await fetch(`${API_BASE_URL}/water-monitoring/latest`);
    return handleResponse(response);
  },

  getStats: async (days = 7) => {
    const response = await fetch(`${API_BASE_URL}/water-monitoring/stats?days=${days}`);
    return handleResponse(response);
  },

  create: async (data: { waterLevel: number; waterLevelUnit?: string; rainfallIndicator?: string; deviceStatus?: string; notes?: string }) => {
    return fetchWithAuth('/water-monitoring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return fetchWithAuth(`/water-monitoring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/water-monitoring/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings
export const settingsAPI = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    return handleResponse(response);
  },

  update: async (data: any) => {
    return fetchWithAuth('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Audit Logs
export const auditLogsAPI = {
  getAll: async (params?: { limit?: number; offset?: number; userId?: string; action?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    return fetchWithAuth(`/audit-logs?${queryParams.toString()}`);
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/audit-logs/${id}`);
  },

  create: async (data: { action: string; target: string; details: string }) => {
    return fetchWithAuth('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// FAQs
export const faqsAPI = {
  getAll: async (published?: boolean) => {
    const params = published !== undefined ? `?published=${published}` : '';
    return fetchWithAuth(`/faqs${params}`);
  },

  getPublic: async () => {
    const response = await fetch(`${API_BASE_URL}/faqs/public`);
    return handleResponse(response);
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/faqs/${id}`);
  },

  create: async (data: { category: string; question: string; answer: string; isPublished?: boolean; order?: number }) => {
    return fetchWithAuth('/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { category?: string; question?: string; answer?: string; isPublished?: boolean; order?: number }) => {
    return fetchWithAuth(`/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  togglePublish: async (id: string) => {
    return fetchWithAuth(`/faqs/${id}/toggle-publish`, {
      method: 'PATCH',
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/faqs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Inquiries
export const inquiriesAPI = {
  getAll: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    return fetchWithAuth(`/inquiries?${queryParams.toString()}`);
  },

  getById: async (id: string) => {
    return fetchWithAuth(`/inquiries/${id}`);
  },

  create: async (data: { name: string; email: string; phone?: string; subject: string; message: string }) => {
    const response = await fetch(`${API_BASE_URL}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: { status?: string; reply?: string }) => {
    return fetchWithAuth(`/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return fetchWithAuth(`/inquiries/${id}`, {
      method: 'DELETE',
    });
  },

  getUnreadCount: async () => {
    return fetchWithAuth('/inquiries/unread-count');
  },
};

