// KommunalCRM API Client - replacing Base44 SDK

const API_URL = import.meta.env.VITE_API_URL || '';

// Token management
let authToken = localStorage.getItem('auth_token');

const setToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

const getToken = () => authToken;

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

// Auth API
const auth = {
  async register(data) {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(result.token);
    return result.user;
  },

  async login(email, password) {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.token);
    return result.user;
  },

  async logout() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
  },

  async me() {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    return request(`/api/auth/me?authorization=${authToken}`);
  },

  async updateMe(data) {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    return request(`/api/auth/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  isLoggedIn() {
    return !!authToken;
  },

  getToken,
  setToken,
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
      params.set('sort', sort);
      params.set('limit', limit.toString());
      return request(`/api/${collectionName}?${params.toString()}`);
    },

    async get(id) {
      return request(`/api/${collectionName}/${id}`);
    },

    async create(data) {
      const result = await request(`/api/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      notifySubscribers();
      return result;
    },

    async update(id, data) {
      const result = await request(`/api/${collectionName}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      notifySubscribers();
      return result;
    },

    async delete(id) {
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
  Invoice: createEntity('invoices'),
  SupportTicket: createEntity('support_tickets'),
  WorkflowRule: createEntity('workflow_rules'),
  MandateLevy: createEntity('mandate_levies'),
  LevyRule: createEntity('levy_rules'),
  Income: createEntity('incomes'),
  Expense: createEntity('expenses'),
  Receipt: createEntity('receipts'),
  Budget: createEntity('budgets'),
};

// Main export - compatible with base44 SDK interface
export const base44 = {
  auth,
  entities,
};

export default base44;
