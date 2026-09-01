/**
 * TowerTech Python FastAPI Backend Client
 * Connects the React/TypeScript frontend to the FastAPI REST API layer.
 */

const API_BASE = '/api';

// Helper for JWT Token storage & header injection
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('towertech_jwt_token');
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem('towertech_jwt_token', token);
    } else {
      localStorage.removeItem('towertech_jwt_token');
    }
  } catch {
    // Ignore storage issues
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // --- Auth ---
  auth: {
    login: (loginId: string, password: string, role: string, societyId: string = 'GV2026') =>
      request<{ access_token: string; token_type: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId, password, role, societyId }),
      }),
    me: () => request<{ status: string; user: any }>('/auth/me'),
    logout: () => request<{ status: string; message: string }>('/auth/logout', { method: 'POST' }),
    resetPassword: (email: string) =>
      request<{ status: string; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  // --- Society ---
  society: {
    list: () => request<any[]>('/society'),
    create: (data: any) =>
      request<any>('/society', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (societyId: string, data: any) =>
      request<any>(`/society/${societyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // --- Residents ---
  residents: {
    list: (params?: { tower?: string; floor?: number; flat?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.tower) q.set('tower', params.tower);
      if (params?.floor !== undefined) q.set('floor', String(params.floor));
      if (params?.flat) q.set('flat', params.flat);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/residents?${q.toString()}`);
    },
    getById: (id: string) => request<any>(`/residents/${id}`),
    create: (data: any) =>
      request<any>('/residents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/residents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/residents/${id}`, {
        method: 'DELETE',
      }),
  },

  // --- Complaints ---
  complaints: {
    list: (params?: { resident_id?: string; society_id?: string; status?: string; category?: string }) => {
      const q = new URLSearchParams();
      if (params?.resident_id) q.set('resident_id', params.resident_id);
      if (params?.society_id) q.set('society_id', params.society_id);
      if (params?.status) q.set('status', params.status);
      if (params?.category) q.set('category', params.category);
      return request<any[]>(`/complaints?${q.toString()}`);
    },
    getById: (id: string) => request<any>(`/complaints/${id}`),
    create: (data: any) =>
      request<any>('/complaints', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, data: { status: string; admin_comment?: string; assigned_to?: string; priority?: string }) =>
      request<any>(`/complaints/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/complaints/${id}`, {
        method: 'DELETE',
      }),
  },

  // --- Maintenance ---
  maintenance: {
    list: (params?: { resident_id?: string; society_id?: string; status?: string; month?: string; tower?: string }) => {
      const q = new URLSearchParams();
      if (params?.resident_id) q.set('resident_id', params.resident_id);
      if (params?.society_id) q.set('society_id', params.society_id);
      if (params?.status) q.set('status', params.status);
      if (params?.month) q.set('month', params.month);
      if (params?.tower) q.set('tower', params.tower);
      return request<any[]>(`/maintenance?${q.toString()}`);
    },
    create: (data: any) =>
      request<any>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createBulk: (data: any) =>
      request<any>('/maintenance/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: 'Paid' | 'Unpaid', payment_date?: string) =>
      request<any>(`/maintenance/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, payment_date }),
      }),
    pay: (id: string, data: { payment_method: string; transaction_id?: string }) =>
      request<any>(`/maintenance/${id}/pay`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/maintenance/${id}`, {
        method: 'DELETE',
      }),
  },

  // --- Amenities & Bookings ---
  amenities: {
    list: (society_id?: string) =>
      request<any[]>(`/amenities${society_id ? `?society_id=${society_id}` : ''}`),
    create: (data: any) =>
      request<any>('/amenities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/amenities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/amenities/${id}`, {
        method: 'DELETE',
      }),
  },

  bookings: {
    list: (params?: { resident_id?: string; society_id?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.resident_id) q.set('resident_id', params.resident_id);
      if (params?.society_id) q.set('society_id', params.society_id);
      if (params?.status) q.set('status', params.status);
      return request<any[]>(`/bookings?${q.toString()}`);
    },
    create: (data: any) =>
      request<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, data: { status: string; admin_comment?: string }) =>
      request<any>(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/bookings/${id}`, {
        method: 'DELETE',
      }),
  },

  // --- Visitors & Security ---
  visitors: {
    list: (params?: { resident_id?: string; society_id?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.resident_id) q.set('resident_id', params.resident_id);
      if (params?.society_id) q.set('society_id', params.society_id);
      if (params?.status) q.set('status', params.status);
      return request<any[]>(`/visitors?${q.toString()}`);
    },
    create: (data: any) =>
      request<any>('/visitors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyPass: (data: { otp_code?: string; qr_pass_code?: string }) =>
      request<any>('/visitors/verify-pass', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordEntry: (id: string) =>
      request<any>(`/visitors/${id}/entry`, { method: 'PUT' }),
    recordExit: (id: string) =>
      request<any>(`/visitors/${id}/exit`, { method: 'PUT' }),
  },

  parcels: {
    list: (params?: { resident_id?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.resident_id) q.set('resident_id', params.resident_id);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/parcels?${q.toString()}`);
    },
    create: (data: any) =>
      request<any>('/parcels', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    collect: (id: string) =>
      request<any>(`/parcels/${id}/collect`, { method: 'PUT' }),
  },

  security: {
    getGuards: (society_id?: string) =>
      request<any[]>(`/security${society_id ? `?society_id=${society_id}` : ''}`),
    createGuard: (data: any) =>
      request<any>('/security', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  staff: {
    list: (params?: { service_type?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.service_type) q.set('service_type', params.service_type);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/staff?${q.toString()}`);
    },
  },

  // --- Community Chat ---
  chat: {
    getMessages: (groupId: string = 'general', society_id?: string) => {
      const q = new URLSearchParams({ group_id: groupId });
      if (society_id) q.set('society_id', society_id);
      return request<any[]>(`/chat/messages?${q.toString()}`);
    },
    sendMessage: (data: { group_id?: string; content: string; media_url?: string; society_id?: string }) =>
      request<any>('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // --- Notices & Emergency ---
  notices: {
    list: (params?: { category?: string; tower?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.category) q.set('category', params.category);
      if (params?.tower) q.set('tower', params.tower);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/notices?${q.toString()}`);
    },
    create: (data: any) =>
      request<any>('/notices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<any>(`/notices/${id}`, {
        method: 'DELETE',
      }),
  },

  emergency: {
    getAlerts: (society_id?: string) =>
      request<any[]>(`/emergency/alerts${society_id ? `?society_id=${society_id}` : ''}`),
    trigger: (data: any) =>
      request<any>('/emergency/trigger', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resolve: (alertId: string) =>
      request<any>(`/emergency/resolve/${alertId}`, {
        method: 'PUT',
      }),
  },

  // --- Financial Module (Admin Only) ---
  financial: {
    getSummary: (society_id?: string) =>
      request<any>(`/financial/summary${society_id ? `?society_id=${society_id}` : ''}`),
    getTransactions: (params?: { category_id?: string; txn_type?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.category_id) q.set('category_id', params.category_id);
      if (params?.txn_type) q.set('txn_type', params.txn_type);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/financial/transactions?${q.toString()}`);
    },
    createTransaction: (data: any) =>
      request<any>('/financial/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCategories: () => request<any[]>('/financial/categories'),
    getBudget: () => request<any[]>('/financial/budget'),
  },

  // --- AI & Machine Learning Analytics ---
  ai: {
    categorizeComplaint: (description: string) =>
      request<any>('/ai/categorize-complaint', {
        method: 'POST',
        body: JSON.stringify({ description }),
      }),
    getFinancialAnalytics: (society_id?: string) =>
      request<any>(`/ai/financial-analytics${society_id ? `?society_id=${society_id}` : ''}`),
    getMaintenanceForecast: (society_id?: string) =>
      request<any>(`/ai/maintenance-forecast${society_id ? `?society_id=${society_id}` : ''}`),
    getRecommendations: () => request<any[]>('/ai/recommendations'),
  },

  // --- Notifications ---
  notifications: {
    list: (params?: { user_id?: string; role?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.user_id) q.set('user_id', params.user_id);
      if (params?.role) q.set('role', params.role);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/notifications?${q.toString()}`);
    },
    markRead: (id: string) =>
      request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
      request<any>('/notifications/read-all', { method: 'PUT' }),
  },

  // --- File Upload ---
  upload: {
    file: async (file: File): Promise<{ status: string; file_url: string; filename: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error('File upload failed');
      return res.json();
    },
  },

  // --- Audit Activity Logs ---
  activityLogs: {
    list: (params?: { module?: string; society_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.module) q.set('module', params.module);
      if (params?.society_id) q.set('society_id', params.society_id);
      return request<any[]>(`/activity-logs?${q.toString()}`);
    },
  },

  // --- System Settings ---
  settings: {
    get: (society_id: string = 'GV2026') =>
      request<any>(`/settings?society_id=${society_id}`),
    update: (data: any) =>
      request<any>('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};
