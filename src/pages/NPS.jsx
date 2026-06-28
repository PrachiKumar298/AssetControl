import React, { useState, useEffect } from 'react';
import { dbClient } from '../db';
import ProfileCreator from '../components/ProfileCreator';
import { FileText, Trash2, Save, Check, AlertCircle } from 'lucide-react';

export default function NPS() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editStates, setEditStates] = useState({}); // { profileId: { name, nps_invested, nps_current } }
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
          states[p.id] = { 
            name: p.name, 
            nps_invested: p.nps_invested, 
            nps_current: p.nps_current 
          };
        });
        setEditStates(states);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCreated = () => {
    setSuccessMsg('Profile created — it is now available in all sections.');
    fetchProfiles();
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
    const nps_invested = parseFloat(state.nps_invested);
    const nps_current = parseFloat(state.nps_current);
    if (isNaN(nps_invested) || nps_invested < 0 || isNaN(nps_current) || nps_current < 0) {
      setError('Amounts must be valid non-negative numbers.');
      return;
    }

    try {
      const { error: err } = await dbClient.profiles.update(profileId, {
        name: state.name.trim(),
        nps_invested,
        nps_current
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

  // Compounded values
  const totalInvested = profiles.reduce((sum, p) => sum + parseFloat(p.nps_invested || 0), 0);
  const totalCurrent = profiles.reduce((sum, p) => sum + parseFloat(p.nps_current || 0), 0);
  const totalProfit = totalCurrent - totalInvested;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
        <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">National Pension System (NPS)</h2>
          <p className="text-sm text-brand-dark/50">Manage long-term, retirement-focused NPS investments per profile</p>
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

      {/* Profile Creator */}
      <ProfileCreator
        onCreated={handleProfileCreated}
        onError={(msg) => setError(msg)}
      />

      {loading ? (
        <div className="text-center py-12 text-brand-dark/50">Loading NPS profiles...</div>
      ) : (
        <div className="space-y-8">
          {/* Main Profiles Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Personal NPS Accounts</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell w-1/4">Profile Name</th>
                    <th className="table-header-cell w-1/4">Invested Amount</th>
                    <th className="table-header-cell w-1/4">Current Value</th>
                    <th className="table-header-cell w-1/8">Profit / Loss</th>
                    <th className="table-header-cell w-1/8 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-row-cell text-center text-brand-dark/50 py-8">
                        No profiles created yet. Create a profile above to start managing NPS details.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p) => {
                      const state = editStates[p.id] || { 
                        name: p.name, 
                        nps_invested: p.nps_invested, 
                        nps_current: p.nps_current 
                      };
                      const hasChanged = state.name !== p.name || 
                        parseFloat(state.nps_invested) !== parseFloat(p.nps_invested) ||
                        parseFloat(state.nps_current) !== parseFloat(p.nps_current);

                      const profit = parseFloat(state.nps_current) - parseFloat(state.nps_invested);
                      
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
                                value={state.nps_invested}
                                onChange={(e) => handleInputChange(p.id, 'nps_invested', e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono font-medium"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell">
                            <div className="flex items-center space-x-1">
                              <span className="text-brand-dark/40 font-mono text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={state.nps_current}
                                onChange={(e) => handleInputChange(p.id, 'nps_current', e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono font-medium"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell font-mono font-semibold">
                            <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {profit >= 0 ? '+' : ''}${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
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

          {/* Compounded Statement */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Compounded NPS Statement</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell">Profiles</th>
                    <th className="table-header-cell">Total Invested</th>
                    <th className="table-header-cell">Total Current Value</th>
                    <th className="table-header-cell">Total Profit / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-brand-orange/5 font-semibold">
                    <td className="table-row-cell text-brand-orange font-bold">
                      {profiles.length} Accounts
                    </td>
                    <td className="table-row-cell font-mono text-brand-orange">
                      ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-row-cell font-mono text-brand-orange">
                      ${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-row-cell font-mono font-extrabold">
                      <span className={totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
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
