// KommunalCRM API Client - replacing Base44 SDK

const API_URL = import.meta.env.REACT_APP_BACKEND_URL;
if (!API_URL) {
  throw new Error('REACT_APP_BACKEND_URL not configured');
}

// Token management
let authToken = localStorage.getItem('auth_token');
let userRole = localStorage.getItem('user_role');

const setToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

const setRole = (role) => {
  userRole = role || 'member';
  if (userRole) {
    localStorage.setItem('user_role', userRole);
  } else {
    localStorage.removeItem('user_role');
  }
};

const clearRole = () => {
  userRole = null;
  localStorage.removeItem('user_role');
};

const getToken = () => authToken;
const getRole = () => userRole;
const ensureWriteAccess = () => {
  if (getRole() === 'viewer') {
    throw new Error('Nur Lesezugriff');
  }
};

// HTTP client
const request = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
};

const uploadFile = async (file) => {
  const url = `${API_URL}/api/files/upload`;
  const formData = new FormData();
  formData.append('file', file);

  const headers = {
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
};

// Auth API
const auth = {
  async register(data) {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(result.token);
    setRole(result.user?.role);
    return result.user;
  },

  async login(email, password) {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.token);
    setRole(result.user?.role);
    return result.user;
  },

  async resetPassword(email, newPassword) {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password: newPassword }),
    });
  },

  async logout() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    clearRole();
  },

  async me() {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    const result = await request(`/api/auth/me?authorization=${authToken}`);
    setRole(result?.role);
    return result;
  },

  async updateMe(data) {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    return request(`/api/auth/me?authorization=${authToken}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  isLoggedIn() {
    return !!authToken;
  },

  getToken,
  setToken,
  setRole,
  getRole,
};

// Entity factory - creates CRUD methods for any entity
const createEntity = (collectionName) => {
  const subscriptions = new Set();
  
  const notifySubscribers = () => {
    subscriptions.forEach(callback => callback());
  };

  return {
    async list(sort = '-created_date', limit = 100) {
      return request(`/api/${collectionName}?sort=${sort}&limit=${limit}`);
    },

    async filter(query = {}, sort = '-created_date', limit = 100) {
      const params = new URLSearchParams();
      if (query.organization) params.set('organization', query.organization);
      if (query.id) params.set('id', query.id);
      if (query.name) params.set('name', query.name);
      params.set('sort', sort);
      params.set('limit', limit.toString());
      return request(`/api/${collectionName}?${params.toString()}`);
    },

    async get(id) {
      return request(`/api/${collectionName}/${id}`);
    },

    async create(data) {
      ensureWriteAccess();
      const result = await request(`/api/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      notifySubscribers();
      return result;
    },

    async update(id, data) {
      ensureWriteAccess();
      const result = await request(`/api/${collectionName}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      notifySubscribers();
      return result;
    },

    async delete(id) {
      ensureWriteAccess();
      const result = await request(`/api/${collectionName}/${id}`, {
        method: 'DELETE',
      });
      notifySubscribers();
      return result;
    },

    subscribe(callback) {
      subscriptions.add(callback);
      return () => subscriptions.delete(callback);
    },
  };
};

// All entities
const entities = {
  User: createEntity('users'),
  Contact: createEntity('contacts'),
  Motion: createEntity('motions'),
  Meeting: createEntity('meetings'),
  Communication: createEntity('communications'),
  Task: createEntity('tasks'),
  Document: createEntity('documents'),
  Campaign: createEntity('campaigns'),
  CampaignEvent: createEntity('campaign_events'),
  CampaignExpense: createEntity('campaign_expenses'),
  Volunteer: createEntity('volunteers'),
  Organization: createEntity('organizations'),
  FractionMeeting: createEntity('fraction_meetings'),
  FractionMeetingTemplate: createEntity('fraction_meeting_templates'),
  MemberGroup: createEntity('member_groups'),
  MediaPost: createEntity('media_posts'),
  PrintTemplate: createEntity('print_templates'),
  AppSettings: createEntity('app_settings'),
  SupportTicket: createEntity('support_tickets'),
  EmailLog: createEntity('email_logs'),
  SystemLog: createEntity('system_logs'),
  Invoice: createEntity('invoices'),
  WorkflowRule: createEntity('workflow_rules'),
  MandateLevy: createEntity('mandate_levies'),
  LevyRule: createEntity('levy_rules'),
  Income: createEntity('incomes'),
  Expense: createEntity('expenses'),
  Receipt: createEntity('receipts'),
  Budget: createEntity('budgets'),
};

// AI API
const ai = {
  async generateEmail(topic, organizationName = null) {
    return request('/api/ai/generate-email', {
      method: 'POST',
      body: JSON.stringify({ topic, organization_name: organizationName }),
    });
  },

  async generateProtocol(prompt, context = null) {
    return request('/api/ai/generate-protocol', {
      method: 'POST',
      body: JSON.stringify({ prompt, context }),
    });
  },

  async generateInvitation(prompt, context = null) {
    return request('/api/ai/generate-invitation', {
      method: 'POST',
      body: JSON.stringify({ prompt, context }),
    });
  },

  async generateText(prompt, taskType = 'general', systemMessage = null) {
    return request('/api/ai/generate-text', {
      method: 'POST',
      body: JSON.stringify({ prompt, task_type: taskType, system_message: systemMessage }),
    });
  },

  async generateNotice(prompt, levyData = null, organizationData = null) {
    return request('/api/ai/generate-notice', {
      method: 'POST',
      body: JSON.stringify({ prompt, levy_data: levyData, organization_data: organizationData }),
    });
  },

  async scanReceipt(fileUrl, organization) {
    return request('/api/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ file_url: fileUrl, organization }),
    });
  },

  async scanBankStatement(fileUrl, organization) {
    return request('/api/ai/scan-bank-statement', {
      method: 'POST',
      body: JSON.stringify({ file_url: fileUrl, organization }),
    });
  },
};

// Email API
const email = {
  async sendBulk(to, subject, body, attachment = null) {
    return request('/api/email/send-invitation', {
      method: 'POST',
      body: JSON.stringify({
        to,
        subject,
        body,
        attachment_base64: attachment?.base64 || null,
        attachment_filename: attachment?.filename || null,
      }),
    });
  },
};

const search = {
  async global(query, organization) {
    const params = new URLSearchParams({ q: query, organization });
    return request(`/api/search?${params.toString()}`);
  },
};

const reminders = {
  async sendNow(meetingId, meetingType = "meeting") {
    return request('/api/reminders/send-now', {
      method: 'POST',
      body: JSON.stringify({ meeting_id: meetingId, meeting_type: meetingType }),
    });
  },
};

const smtp = {
  async test(organization, testEmail) {
    return request('/api/smtp/test', {
      method: 'POST',
      body: JSON.stringify({ organization, test_email: testEmail }),
    });
  },
};

const organizations = {
  async getMembers(orgName) {
    return request(`/api/organizations/${encodeURIComponent(orgName)}/members`);
  },
};

const users = {
  async updateRole(userId, orgRole) {
    return request(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ org_role: orgRole }),
    });
  },
};

const datev = {
  async status() {
    return request('/api/datev/status');
  },
};

const files = {
  upload: uploadFile,
};

// Main export - compatible with base44 SDK interface
export const base44 = {
  auth,
  entities,
  ai,
  email,
  search,
  reminders,
  datev,
  files,
  organizations,
  users,
  smtp,
};

export default base44;
