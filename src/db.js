import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabase = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// -------------------------------------------------------------
// LOCAL STORAGE MOCK DATABASE (Fallback mode)
// -------------------------------------------------------------
const getLocalStorageDB = () => {
  const defaultDB = {
    users: [],
    profiles: [],
    companies: [],
    real_estate: [],
    transactions: [],
    session: null
  };
  try {
    const data = localStorage.getItem('personal_investments_db');
    return data ? JSON.parse(data) : defaultDB;
  } catch (e) {
    return defaultDB;
  }
};

const saveLocalStorageDB = (db) => {
  localStorage.setItem('personal_investments_db', JSON.stringify(db));
};

let authCallbacks = [];

const mockAuth = {
  signUp: async ({ email, password, username }) => {
    // Basic password validation is handled in SignUp.jsx, but let's be safe
    const db = getLocalStorageDB();
    const exists = db.users.find(u => u.email === email);
    if (exists) {
      return { data: { user: null }, error: { message: 'User already exists' } };
    }
    const newUser = { id: crypto.randomUUID(), email, password, username };
    db.users.push(newUser);
    
    // Automatically log in
    const session = { user: { id: newUser.id, email, user_metadata: { username } } };
    db.session = session;
    saveLocalStorageDB(db);
    
    authCallbacks.forEach(cb => cb('SIGNED_IN', session));
    return { data: { user: session.user, session }, error: null };
  },

  signIn: async ({ email, password }) => {
    const db = getLocalStorageDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) {
      return { data: { user: null }, error: { message: 'Invalid credentials' } };
    }
    const session = { user: { id: user.id, email, user_metadata: { username: user.username } } };
    db.session = session;
    saveLocalStorageDB(db);

    authCallbacks.forEach(cb => cb('SIGNED_IN', session));
    return { data: { user: session.user, session }, error: null };
  },

  signOut: async () => {
    const db = getLocalStorageDB();
    db.session = null;
    saveLocalStorageDB(db);
    authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },

  getSession: async () => {
    const db = getLocalStorageDB();
    return { data: { session: db.session }, error: null };
  },

  onAuthStateChange: (callback) => {
    authCallbacks.push(callback);
    // Initial call
    const db = getLocalStorageDB();
    callback(db.session ? 'SIGNED_IN' : 'SIGNED_OUT', db.session);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authCallbacks = authCallbacks.filter(cb => cb !== callback);
          }
        }
      }
    };
  }
};

const mockProfiles = {
  list: async () => {
    const db = getLocalStorageDB();
    if (!db.session) return { data: [], error: { message: 'Not authenticated' } };
    const list = db.profiles.filter(p => p.user_id === db.session.user.id);
    return { data: list, error: null };
  },
  create: async (name) => {
    const db = getLocalStorageDB();
    if (!db.session) return { data: null, error: { message: 'Not authenticated' } };
    const newProfile = {
      id: crypto.randomUUID(),
      user_id: db.session.user.id,
      name,
      bank_amount: 0,
      ppf_invested: 0,
      ppf_current: 0,
      nps_invested: 0,
      nps_current: 0,
      created_at: new Date().toISOString()
    };
    db.profiles.push(newProfile);
    saveLocalStorageDB(db);
    return { data: newProfile, error: null };
  },
  update: async (id, updates) => {
    const db = getLocalStorageDB();
    const index = db.profiles.findIndex(p => p.id === id);
    if (index === -1) return { data: null, error: { message: 'Profile not found' } };
    db.profiles[index] = { ...db.profiles[index], ...updates };
    saveLocalStorageDB(db);
    return { data: db.profiles[index], error: null };
  },
  delete: async (id) => {
    const db = getLocalStorageDB();
    db.profiles = db.profiles.filter(p => p.id !== id);
    db.companies = db.companies.filter(c => c.profile_id !== id);
    db.real_estate = db.real_estate.filter(r => r.profile_id !== id);
    db.transactions = db.transactions.filter(t => t.profile_id !== id);
    saveLocalStorageDB(db);
    return { data: null, error: null };
  }
};

const mockCompanies = {
  list: async (profileId) => {
    const db = getLocalStorageDB();
    const list = db.companies.filter(c => c.profile_id === profileId);
    return { data: list, error: null };
  },
  listAll: async () => {
    const db = getLocalStorageDB();
    if (!db.session) return { data: [], error: { message: 'Not authenticated' } };
    const myProfileIds = db.profiles.filter(p => p.user_id === db.session.user.id).map(p => p.id);
    const list = db.companies.filter(c => myProfileIds.includes(c.profile_id));
    return { data: list, error: null };
  },
  create: async (companyData) => {
    const db = getLocalStorageDB();
    const newCompany = {
      id: crypto.randomUUID(),
      nominee: '',
      bank: '',
      avg_price: 0,
      quantity: 0,
      current_price: 0,
      ...companyData,
      created_at: new Date().toISOString()
    };
    db.companies.push(newCompany);
    saveLocalStorageDB(db);
    return { data: newCompany, error: null };
  },
  update: async (id, updates) => {
    const db = getLocalStorageDB();
    const index = db.companies.findIndex(c => c.id === id);
    if (index === -1) return { data: null, error: { message: 'Company not found' } };
    db.companies[index] = { ...db.companies[index], ...updates };
    saveLocalStorageDB(db);
    return { data: db.companies[index], error: null };
  },
  delete: async (id) => {
    const db = getLocalStorageDB();
    db.companies = db.companies.filter(c => c.id !== id);
    db.transactions = db.transactions.filter(t => t.company_id !== id);
    saveLocalStorageDB(db);
    return { data: null, error: null };
  }
};

const mockRealEstate = {
  list: async (profileId) => {
    const db = getLocalStorageDB();
    const list = db.real_estate.filter(r => r.profile_id === profileId);
    return { data: list, error: null };
  },
  listAll: async () => {
    const db = getLocalStorageDB();
    if (!db.session) return { data: [], error: { message: 'Not authenticated' } };
    const myProfileIds = db.profiles.filter(p => p.user_id === db.session.user.id).map(p => p.id);
    const list = db.real_estate.filter(r => myProfileIds.includes(r.profile_id));
    return { data: list, error: null };
  },
  create: async (data) => {
    const db = getLocalStorageDB();
    const newRE = {
      id: crypto.randomUUID(),
      invested: 0,
      current_val: 0,
      ...data,
      created_at: new Date().toISOString()
    };
    db.real_estate.push(newRE);
    saveLocalStorageDB(db);
    return { data: newRE, error: null };
  },
  update: async (id, updates) => {
    const db = getLocalStorageDB();
    const index = db.real_estate.findIndex(r => r.id === id);
    if (index === -1) return { data: null, error: { message: 'Real estate not found' } };
    db.real_estate[index] = { ...db.real_estate[index], ...updates };
    saveLocalStorageDB(db);
    return { data: db.real_estate[index], error: null };
  },
  delete: async (id) => {
    const db = getLocalStorageDB();
    db.real_estate = db.real_estate.filter(r => r.id !== id);
    saveLocalStorageDB(db);
    return { data: null, error: null };
  }
};

const mockTransactions = {
  list: async (profileId) => {
    const db = getLocalStorageDB();
    const list = db.transactions.filter(t => t.profile_id === profileId);
    return { data: list, error: null };
  },
  create: async (data) => {
    const db = getLocalStorageDB();
    const newTx = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...data
    };
    db.transactions.push(newTx);
    saveLocalStorageDB(db);
    return { data: newTx, error: null };
  }
};

// -------------------------------------------------------------
// EXPORTED DUAL-MODE DB CLIENT
// -------------------------------------------------------------
export const dbClient = {
  isMock: !isSupabaseConfigured,
  
  auth: {
    signUp: async ({ email, password, username }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        return { data, error };
      }
      return mockAuth.signUp({ email, password, username });
    },
    
    signIn: async ({ email, password }) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
      }
      return mockAuth.signIn({ email, password });
    },
    
    signOut: async () => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        return { error };
      }
      return mockAuth.signOut();
    },
    
    getSession: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.getSession();
        return { data, error };
      }
      return mockAuth.getSession();
    },
    
    onAuthStateChange: (callback) => {
      if (isSupabaseConfigured) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          callback(event, session);
        });
        return data.subscription;
      }
      return mockAuth.onAuthStateChange(callback);
    }
  },
  
  profiles: {
    list: async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('profiles').select('*').order('name');
        return { data, error };
      }
      return mockProfiles.list();
    },
    create: async (name) => {
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        const user_id = sessionData?.session?.user?.id;
        const { data, error } = await supabase.from('profiles').insert([{ name, user_id }]).select().single();
        return { data, error };
      }
      return mockProfiles.create(name);
    },
    update: async (id, updates) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
        return { data, error };
      }
      return mockProfiles.update(id, updates);
    },
    delete: async (id) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        return { data: null, error };
      }
      return mockProfiles.delete(id);
    }
  },
  
  companies: {
    list: async (profileId) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('companies').select('*').eq('profile_id', profileId).order('company_name');
        return { data, error };
      }
      return mockCompanies.list(profileId);
    },
    listAll: async () => {
      if (isSupabaseConfigured) {
        // First get profile ids for user
        const { data: profilesData } = await supabase.from('profiles').select('id');
        const pIds = profilesData?.map(p => p.id) || [];
        if (pIds.length === 0) return { data: [], error: null };
        const { data, error } = await supabase.from('companies').select('*').in('profile_id', pIds).order('company_name');
        return { data, error };
      }
      return mockCompanies.listAll();
    },
    create: async (companyData) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('companies').insert([companyData]).select().single();
        return { data, error };
      }
      return mockCompanies.create(companyData);
    },
    update: async (id, updates) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
        return { data, error };
      }
      return mockCompanies.update(id, updates);
    },
    delete: async (id) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        return { data: null, error };
      }
      return mockCompanies.delete(id);
    }
  },
  
  realEstate: {
    list: async (profileId) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('real_estate').select('*').eq('profile_id', profileId).order('name');
        return { data, error };
      }
      return mockRealEstate.list(profileId);
    },
    listAll: async () => {
      if (isSupabaseConfigured) {
        const { data: profilesData } = await supabase.from('profiles').select('id');
        const pIds = profilesData?.map(p => p.id) || [];
        if (pIds.length === 0) return { data: [], error: null };
        const { data, error } = await supabase.from('real_estate').select('*').in('profile_id', pIds).order('name');
        return { data, error };
      }
      return mockRealEstate.listAll();
    },
    create: async (reData) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('real_estate').insert([reData]).select().single();
        return { data, error };
      }
      return mockRealEstate.create(reData);
    },
    update: async (id, updates) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('real_estate').update(updates).eq('id', id).select().single();
        return { data, error };
      }
      return mockRealEstate.update(id, updates);
    },
    delete: async (id) => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('real_estate').delete().eq('id', id);
        return { data: null, error };
      }
      return mockRealEstate.delete(id);
    }
  },
  
  transactions: {
    list: async (profileId) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('transactions').select('*').eq('profile_id', profileId).order('created_at', { ascending: false });
        return { data, error };
      }
      return mockTransactions.list(profileId);
    },
    create: async (txData) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('transactions').insert([txData]).select().single();
        return { data, error };
      }
      return mockTransactions.create(txData);
    }
  }
};
