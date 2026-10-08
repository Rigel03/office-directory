const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('directory_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('directory_token', token);
  } else {
    localStorage.removeItem('directory_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    // If unauthorized, notify listeners
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  // Handle binary/blob responses for export downloads
  const contentType = response.headers.get('content-type') || '';
  if (
    contentType.includes('spreadsheetml') ||
    contentType.includes('octet-stream') ||
    contentType.includes('text/csv')
  ) {
    if (!response.ok) {
      throw new Error('Export download failed');
    }
    return response.blob();
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Employees
  getEmployees: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/employees${qs ? '?' + qs : ''}`);
  },
  getUnits: () => request('/employees/units'),
  getUnitsSummary: () => request('/employees/units/summary'),
  renameUnit: (oldUnit, newUnit) => request('/employees/units/rename', { method: 'PUT', body: JSON.stringify({ oldUnit, newUnit }) }),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  patchInline: (id, field, value) => request(`/employees/${id}/inline`, { method: 'PATCH', body: JSON.stringify({ field, value }) }),
  verifyEmployee: (id) => request(`/employees/${id}/verify`, { method: 'POST' }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  bulkEmployees: (payload) => request('/employees/bulk', { method: 'POST', body: JSON.stringify(payload) }),
  getEmployeeAudit: (id) => request(`/employees/${id}/audit`),
  getSystemAudit: (limit = 50) => request(`/audit-logs?limit=${limit}`),

  // Groups
  getGroups: (type) => request(`/groups${type ? '?type=' + encodeURIComponent(type) : ''}`),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id, data) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  addGroupMembers: (id, employeeIds) => request(`/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ employeeIds }) }),
  removeGroupMember: (groupId, employeeId) => request(`/groups/${groupId}/members/${employeeId}`, { method: 'DELETE' }),
  moveGroupMembers: (sourceGroupId, payload) => request(`/groups/${sourceGroupId}/move-members`, { method: 'POST', body: JSON.stringify(payload) }),

  // Training
  getTrainingRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/training${qs ? '?' + qs : ''}`);
  },
  getQuarters: () => request('/training/quarters'),
  createTraining: (data) => request('/training', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateTraining: (data) => request('/training/bulk', { method: 'POST', body: JSON.stringify(data) }),
  deleteTraining: (id) => request(`/training/${id}`, { method: 'DELETE' }),

  // Import
  previewImport: (formData) => request('/import/preview', { method: 'POST', body: formData }),
  commitImport: (data) => request('/import/commit', { method: 'POST', body: JSON.stringify(data) }),

  // Export
  exportEmployeesBlob: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/export/employees?${qs}`);
  },
  exportTrainingBlob: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/export/training?${qs}`);
  }
};
