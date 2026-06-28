import React, { useState, useEffect } from 'react';
import { dbClient } from '../db';
import ProfileCreator from '../components/ProfileCreator';
import { Home, Plus, Trash2, Save, Check, AlertCircle } from 'lucide-react';

export default function RealEstate() {
  const [profiles, setProfiles] = useState([]);
  const [realEstate, setRealEstate] = useState([]);
  const [loading, setLoading] = useState(true);

  // New property form state
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newInvested, setNewInvested] = useState('');
  const [newCurrent, setNewCurrent] = useState('');

  const [editStates, setEditStates] = useState({}); // { reId: { name, invested, current_val } }
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: pErr } = await dbClient.profiles.list();
      if (pErr) {
        setError(pErr.message);
        return;
      }
      setProfiles(profilesData || []);
      if (profilesData && profilesData.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profilesData[0].id);
      }

      const { data: reData, error: reErr } = await dbClient.realEstate.listAll();
      if (reErr) {
        setError(reErr.message);
        return;
      }
      setRealEstate(reData || []);

      // Initialize edit states
      const states = {};
      (reData || []).forEach(r => {
        states[r.id] = { name: r.name, invested: r.invested, current_val: r.current_val };
      });
      setEditStates(states);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCreated = (newProfile) => {
    setSuccessMsg('Profile created — it is now available in all sections.');
    fetchData();
    // auto-select the newly created profile
    if (newProfile?.id) setSelectedProfileId(newProfile.id);
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!selectedProfileId) {
      setError('Please select a profile first. (Create a profile in Bank/PPF pages if needed)');
      return;
    }
    if (!newPropertyName.trim()) return;

    const invested = parseFloat(newInvested) || 0;
    const current_val = parseFloat(newCurrent) || 0;

    try {
      const { error: err } = await dbClient.realEstate.create({
        profile_id: selectedProfileId,
        name: newPropertyName.trim(),
        invested,
        current_val
      });

      if (err) {
        setError(err.message);
      } else {
        setNewPropertyName('');
        setNewInvested('');
        setNewCurrent('');
        setSuccessMsg('Property added successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to add property.');
    }
  };

  const handleInputChange = (reId, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [reId]: {
        ...prev[reId],
        [field]: value
      }
    }));
  };

  const handleSaveProperty = async (reId) => {
    setError('');
    setSuccessMsg('');
    const state = editStates[reId];
    if (!state.name.trim()) {
      setError('Property name cannot be empty.');
      return;
    }
    const invested = parseFloat(state.invested);
    const current_val = parseFloat(state.current_val);
    if (isNaN(invested) || invested < 0 || isNaN(current_val) || current_val < 0) {
      setError('Amounts must be valid non-negative numbers.');
      return;
    }

    try {
      const { error: err } = await dbClient.realEstate.update(reId, {
        name: state.name.trim(),
        invested,
        current_val
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Property updated successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to update property.');
    }
  };

  const handleDeleteProperty = async (reId) => {
    if (!confirm('Are you sure you want to delete this property listing?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const { error: err } = await dbClient.realEstate.delete(reId);
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Property deleted successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to delete property.');
    }
  };

  // Compounded Totals
  const grandTotalInvested = realEstate.reduce((sum, r) => sum + parseFloat(r.invested || 0), 0);
  const grandTotalCurrent = realEstate.reduce((sum, r) => sum + parseFloat(r.current_val || 0), 0);
  const grandTotalProfit = grandTotalCurrent - grandTotalInvested;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex items-center space-x-3 border-b border-brand-border/60 pb-4">
        <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
          <Home className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Real Estate</h2>
          <p className="text-sm text-brand-dark/50">Track properties and land valuation by investment profile</p>
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

      {/* Profile Creator — always visible so users can create profiles here too */}
      <ProfileCreator
        onCreated={handleProfileCreated}
        onError={(msg) => setError(msg)}
      />

      {/* Add Real Estate Form — only shown when profiles exist */}
      {profiles.length > 0 && (
        <div className="bg-white border border-brand-border/60 p-5 rounded-2xl shadow-xs">
          <h3 className="text-sm font-semibold text-brand-dark/70 mb-4">Add Real Estate Property</h3>
          <form onSubmit={handleAddProperty} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Profile</label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="text-sm rounded-xl px-3 py-2 bg-white"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Property Name</label>
              <input
                type="text"
                placeholder="e.g. Downtown Apartment"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Invested Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 250000"
                value={newInvested}
                onChange={(e) => setNewInvested(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1 justify-end">
              <div className="flex flex-col space-y-1 mb-1">
                <label className="text-xs font-semibold text-brand-dark/60">Current Value</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 275000"
                  value={newCurrent}
                  onChange={(e) => setNewCurrent(e.target.value)}
                  className="text-sm rounded-xl px-3 py-2"
                  required
                />
              </div>
            </div>
            
            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange/95 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-brand-orange/20 transition-all duration-200 text-sm w-full md:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Property</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-brand-dark/50">Loading real estate listings...</div>
      ) : (
        <div className="space-y-8">
          {profiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-brand-border/60 text-brand-dark/50">
              No profiles found. Please create a profile in the Bank Accounts page first.
            </div>
          ) : (
            profiles.map((profile) => {
              const properties = realEstate.filter(r => r.profile_id === profile.id);
              const profileInvested = properties.reduce((sum, r) => sum + parseFloat(r.invested || 0), 0);
              const profileCurrent = properties.reduce((sum, r) => sum + parseFloat(r.current_val || 0), 0);
              const profileProfit = profileCurrent - profileInvested;

              return (
                <div key={profile.id} className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-bold text-brand-dark">{profile.name}'s Real Estate Portfolio</h3>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${profileProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      Total Profit: {profileProfit >= 0 ? '+' : ''}${profileProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="table-container">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-brand-blue/5">
                          <th className="table-header-cell w-2/5">Property Name</th>
                          <th className="table-header-cell w-1/5">Invested Amount</th>
                          <th className="table-header-cell w-1/5">Current Value</th>
                          <th className="table-header-cell w-1/10">Profit / Loss</th>
                          <th className="table-header-cell w-1/10 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {properties.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="table-row-cell text-center text-brand-dark/50 py-6">
                              No property assets listed for this profile yet.
                            </td>
                          </tr>
                        ) : (
                          properties.map((r) => {
                            const state = editStates[r.id] || { name: r.name, invested: r.invested, current_val: r.current_val };
                            const hasChanged = state.name !== r.name || 
                              parseFloat(state.invested) !== parseFloat(r.invested) ||
                              parseFloat(state.current_val) !== parseFloat(r.current_val);

                            const profit = parseFloat(state.current_val) - parseFloat(state.invested);

                            return (
                              <tr key={r.id} className="hover:bg-brand-blue/5 transition-colors">
                                <td className="table-row-cell">
                                  <input
                                    type="text"
                                    value={state.name}
                                    onChange={(e) => handleInputChange(r.id, 'name', e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-medium"
                                  />
                                </td>
                                <td className="table-row-cell">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-brand-dark/40 font-mono text-sm">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={state.invested}
                                      onChange={(e) => handleInputChange(r.id, 'invested', e.target.value)}
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
                                      value={state.current_val}
                                      onChange={(e) => handleInputChange(r.id, 'current_val', e.target.value)}
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
                                        onClick={() => handleSaveProperty(r.id)}
                                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                        title="Save Changes"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteProperty(r.id)}
                                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                      title="Delete Property"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {properties.length > 0 && (
                          <tr className="bg-brand-blue/5 font-semibold text-brand-dark/80">
                            <td className="table-row-cell font-bold">Total</td>
                            <td className="table-row-cell font-mono">${profileInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="table-row-cell font-mono">${profileCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="table-row-cell font-mono" colSpan="2">
                              <span className={profileProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {profileProfit >= 0 ? '+' : ''}${profileProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}

          {/* Compounded Statement */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Compounded Real Estate Statement</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell">Total Properties</th>
                    <th className="table-header-cell">Total Invested</th>
                    <th className="table-header-cell">Total Current Value</th>
                    <th className="table-header-cell">Total Profit / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-brand-orange/5 font-semibold">
                    <td className="table-row-cell text-brand-orange font-bold">
                      {realEstate.length} Properties
                    </td>
                    <td className="table-row-cell font-mono text-brand-orange">
                      ${grandTotalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-row-cell font-mono text-brand-orange">
                      ${grandTotalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-row-cell font-mono font-extrabold">
                      <span className={grandTotalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {grandTotalProfit >= 0 ? '+' : ''}${grandTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
