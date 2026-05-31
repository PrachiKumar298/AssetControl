import React, { useState, useEffect } from 'react';
import { dbClient } from '../db';
import { Landmark, Plus, Trash2, Save, Check, AlertCircle } from 'lucide-react';

export default function Bank() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState('');
  const [editStates, setEditStates] = useState({}); // { profileId: { name, bank_amount } }
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await dbClient.profiles.list();
      if (err) {
        setError(err.message);
      } else {
        setProfiles(data || []);
        // Initialize edit states
        const states = {};
        (data || []).forEach(p => {
          states[p.id] = { name: p.name, bank_amount: p.bank_amount };
        });
        setEditStates(states);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setError('');
    setSuccessMsg('');
    try {
      const { data, error: err } = await dbClient.profiles.create(newProfileName.trim());
      if (err) {
        setError(err.message);
      } else {
        setNewProfileName('');
        setSuccessMsg('Profile created successfully.');
        fetchProfiles();
      }
    } catch (err) {
      setError('Failed to create profile.');
    }
  };

  const handleInputChange = (profileId, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        [field]: value
      }
    }));
  };

  const handleSaveProfile = async (profileId) => {
    setError('');
    setSuccessMsg('');
    const state = editStates[profileId];
    if (!state.name.trim()) {
      setError('Profile name cannot be empty.');
      return;
    }
    const bank_amount = parseFloat(state.bank_amount);
    if (isNaN(bank_amount) || bank_amount < 0) {
      setError('Bank amount must be a positive number.');
      return;
    }

    try {
      const { error: err } = await dbClient.profiles.update(profileId, {
        name: state.name.trim(),
        bank_amount
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Changes saved successfully.');
        fetchProfiles();
      }
    } catch (err) {
      setError('Failed to save profile changes.');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this profile? All associated data will be lost.')) return;
    setError('');
    setSuccessMsg('');
    try {
      const { error: err } = await dbClient.profiles.delete(profileId);
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Profile deleted successfully.');
        fetchProfiles();
      }
    } catch (err) {
      setError('Failed to delete profile.');
    }
  };

  // Compounded Bank Statement values
  const totalBankAmount = profiles.reduce((sum, p) => sum + parseFloat(p.bank_amount || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
        <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Bank Accounts</h2>
          <p className="text-sm text-brand-dark/50">Manage cash balances across your investment profiles</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-center space-x-2 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl flex items-center space-x-2 text-emerald-700 text-sm">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Creator Form */}
      <div className="bg-white border border-brand-border/60 p-5 rounded-2xl shadow-xs">
        <h3 className="text-sm font-semibold text-brand-dark/70 mb-3">Create New Investment Profile</h3>
        <form onSubmit={handleCreateProfile} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. Retirement, Self, Spouse"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="flex-1 text-sm rounded-xl px-4 py-3"
            required
          />
          <button
            type="submit"
            className="flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange/95 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-brand-orange/20 transition-all duration-200 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Profile</span>
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brand-dark/50">Loading bank profiles...</div>
      ) : (
        <div className="space-y-8">
          {/* Main Profiles Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Personal Bank Statements</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell w-2/5">Profile Name</th>
                    <th className="table-header-cell w-2/5">Bank Balance (Amount)</th>
                    <th className="table-header-cell w-1/5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="table-row-cell text-center text-brand-dark/50 py-8">
                        No profiles created yet. Create a profile above to start managing bank balances.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p) => {
                      const state = editStates[p.id] || { name: p.name, bank_amount: p.bank_amount };
                      const hasChanged = state.name !== p.name || parseFloat(state.bank_amount) !== parseFloat(p.bank_amount);
                      
                      return (
                        <tr key={p.id} className="hover:bg-brand-blue/5 transition-colors">
                          <td className="table-row-cell">
                            <input
                              type="text"
                              value={state.name}
                              onChange={(e) => handleInputChange(p.id, 'name', e.target.value)}
                              className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-medium"
                            />
                          </td>
                          <td className="table-row-cell">
                            <div className="flex items-center space-x-1">
                              <span className="text-brand-dark/40 font-mono text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={state.bank_amount}
                                onChange={(e) => handleInputChange(p.id, 'bank_amount', e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono font-medium"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {hasChanged && (
                                <button
                                  onClick={() => handleSaveProfile(p.id)}
                                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                  title="Save Changes"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProfile(p.id)}
                                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Delete Profile"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compounded Statement Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Compounded Statement</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell w-2/5">Total Accounts</th>
                    <th className="table-header-cell w-3/5">Total Compounded Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-brand-orange/5 font-semibold">
                    <td className="table-row-cell text-base font-bold text-brand-orange">
                      {profiles.length} Profiles
                    </td>
                    <td className="table-row-cell text-lg font-mono font-extrabold text-brand-orange">
                      ${totalBankAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
