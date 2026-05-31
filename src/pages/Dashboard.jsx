import React, { useState, useEffect } from 'react';
import { dbClient } from '../db';
import { LayoutDashboard, Save, Check, AlertCircle, PieChart, BarChart3, TrendingUp, Landmark, ShieldCheck } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const [profiles, setProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [realEstate, setRealEstate] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editStates, setEditStates] = useState({}); // { profileId: { bank_amount, ppf_current, nps_current } }
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

      // Initialize edit states
      const states = {};
      (profilesData || []).forEach(p => {
        states[p.id] = { 
          bank_amount: p.bank_amount, 
          ppf_current: p.ppf_current, 
          nps_current: p.nps_current 
        };
      });
      setEditStates(states);

      const { data: compData, error: cErr } = await dbClient.companies.listAll();
      if (cErr) {
        setError(cErr.message);
        return;
      }
      setCompanies(compData || []);

      const { data: reData, error: reErr } = await dbClient.realEstate.listAll();
      if (reErr) {
        setError(reErr.message);
        return;
      }
      setRealEstate(reData || []);
    } catch (err) {
      setError('Failed to load portfolio dashboard.');
    } finally {
      setLoading(false);
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
    
    const bank_amount = parseFloat(state.bank_amount);
    const ppf_current = parseFloat(state.ppf_current);
    const nps_current = parseFloat(state.nps_current);

    if (isNaN(bank_amount) || bank_amount < 0 || 
        isNaN(ppf_current) || ppf_current < 0 || 
        isNaN(nps_current) || nps_current < 0) {
      setError('Values must be valid non-negative numbers.');
      return;
    }

    try {
      const { error: err } = await dbClient.profiles.update(profileId, {
        bank_amount,
        ppf_current,
        nps_current
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Portfolio values updated successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to save changes.');
    }
  };

  // -------------------------------------------------------------
  // CALCULATION LOGIC (CURRENT VALUES ONLY, NO PROFIT)
  // -------------------------------------------------------------
  
  // Get Stock current value for a profile
  const getProfileStockValue = (profileId) => {
    return companies
      .filter(c => c.profile_id === profileId)
      .reduce((sum, c) => sum + (parseFloat(c.current_price || 0) * parseFloat(c.quantity || 0)), 0);
  };

  // Get Real Estate current value for a profile
  const getProfileREValue = (profileId) => {
    return realEstate
      .filter(r => r.profile_id === profileId)
      .reduce((sum, r) => sum + parseFloat(r.current_val || 0), 0);
  };

  // Sum up totals across profiles
  let totalStocksCurrent = 0;
  let totalBankCurrent = 0;
  let totalPPFCurrent = 0;
  let totalNPSCurrent = 0;
  let totalRECurrent = 0;

  const profileSummaryRows = profiles.map(p => {
    const stocksVal = getProfileStockValue(p.id);
    const bankVal = parseFloat(p.bank_amount || 0);
    const ppfVal = parseFloat(p.ppf_current || 0);
    const npsVal = parseFloat(p.nps_current || 0);
    const reVal = getProfileREValue(p.id);

    totalStocksCurrent += stocksVal;
    totalBankCurrent += bankVal;
    totalPPFCurrent += ppfVal;
    totalNPSCurrent += npsVal;
    totalRECurrent += reVal;

    const rowTotal = stocksVal + bankVal + ppfVal + npsVal + reVal;

    return {
      id: p.id,
      name: p.name,
      stocksVal,
      bankVal,
      ppfVal,
      npsVal,
      reVal,
      rowTotal
    };
  });

  const grandTotal = totalStocksCurrent + totalBankCurrent + totalPPFCurrent + totalNPSCurrent + totalRECurrent;

  // -------------------------------------------------------------
  // CHART DATA CONFIGURATIONS
  // -------------------------------------------------------------
  
  // 1. Pie Chart - Asset Allocation
  const pieData = {
    labels: ['Stocks', 'Bank Accounts', 'PPF', 'NPS', 'Real Estate'],
    datasets: [
      {
        data: [
          totalStocksCurrent,
          totalBankCurrent,
          totalPPFCurrent,
          totalNPSCurrent,
          totalRECurrent
        ],
        backgroundColor: [
          '#E87F24', // brand orange
          '#FFC81E', // brand yellow
          '#73A5CA', // brand blue
          '#4F46E5', // Indigo
          '#10B981'  // Emerald green
        ],
        borderWidth: 1,
        borderColor: '#ffffff',
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#1E293B',
          font: {
            weight: 'bold',
            family: 'Inter'
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
            return ` $${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct}%)`;
          }
        }
      }
    }
  };

  // 2. Bar Chart - Profile Wealth Comparison
  const barData = {
    labels: profileSummaryRows.map(r => r.name),
    datasets: [
      {
        label: 'Current Asset Value ($)',
        data: profileSummaryRows.map(r => r.rowTotal),
        backgroundColor: '#73A5CA',
        hoverBackgroundColor: '#E87F24',
        borderRadius: 8,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Total Portfolio Value per Profile',
        color: '#1E293B',
        font: {
          size: 14,
          weight: 'bold',
          family: 'Inter'
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-dark">Wealth Dashboard</h2>
            <p className="text-sm text-brand-dark/50">Your consolidated portfolio summary (Current values only)</p>
          </div>
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

      {loading ? (
        <div className="text-center py-12 text-brand-dark/50">Loading wealth summaries...</div>
      ) : (
        <div className="space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-brand-border/60 p-6 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-brand-orange/15 rounded-xl text-brand-orange">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wider block">Net Worth (Current)</span>
                <span className="text-2xl font-bold text-brand-dark font-mono">
                  ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div className="bg-white border border-brand-border/60 p-6 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-brand-blue/15 rounded-xl text-brand-blue">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wider block">Invested Equities</span>
                <span className="text-2xl font-bold text-brand-dark font-mono">
                  ${totalStocksCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-white border border-brand-border/60 p-6 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-brand-yellow/15 rounded-xl text-brand-orange">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wider block">Cash & Liquidity</span>
                <span className="text-2xl font-bold text-brand-dark font-mono">
                  ${totalBankCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          {profiles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Asset Allocation Pie Chart */}
              <div className="bg-white border border-brand-border/60 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-brand-border/40 pb-3">
                  <PieChart className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-bold text-brand-dark text-sm">Asset Allocation</h3>
                </div>
                <div className="h-64 relative flex items-center justify-center">
                  {grandTotal === 0 ? (
                    <div className="text-brand-dark/40 text-sm">No asset values to display. Add funds below.</div>
                  ) : (
                    <Pie data={pieData} options={pieOptions} />
                  )}
                </div>
              </div>

              {/* Profile Bar Chart */}
              <div className="bg-white border border-brand-border/60 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-brand-border/40 pb-3">
                  <BarChart3 className="w-5 h-5 text-brand-blue" />
                  <h3 className="font-bold text-brand-dark text-sm">Wealth Distribution</h3>
                </div>
                <div className="h-64 relative">
                  {grandTotal === 0 ? (
                    <div className="text-brand-dark/40 text-sm flex h-full items-center justify-center">No profiles data.</div>
                  ) : (
                    <Bar data={barData} options={barOptions} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabular Profile Summary */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-brand-dark px-1">Consolidated Profile Balances (Current Values)</h3>
            <div className="table-container">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-blue/5">
                    <th className="table-header-cell w-2/12">Profile Name</th>
                    <th className="table-header-cell w-2/12">Stocks Current</th>
                    <th className="table-header-cell w-2/12">Bank balance</th>
                    <th className="table-header-cell w-2/12">PPF Current</th>
                    <th className="table-header-cell w-2/12">NPS Current</th>
                    <th className="table-header-cell w-2/12">Real Estate Current</th>
                    <th className="table-header-cell w-2/12">Total Wealth</th>
                    <th className="table-header-cell text-center w-1/12">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profileSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="table-row-cell text-center text-brand-dark/50 py-8">
                        No investment profiles created yet. Navigate to Bank Accounts to start.
                      </td>
                    </tr>
                  ) : (
                    profileSummaryRows.map((r) => {
                      const state = editStates[r.id] || { 
                        bank_amount: r.bankVal, 
                        ppf_current: r.ppfVal, 
                        nps_current: r.npsVal 
                      };
                      const hasChanged = 
                        parseFloat(state.bank_amount) !== parseFloat(r.bankVal) ||
                        parseFloat(state.ppf_current) !== parseFloat(r.ppfVal) ||
                        parseFloat(state.nps_current) !== parseFloat(r.npsVal);

                      return (
                        <tr key={r.id} className="hover:bg-brand-blue/5 transition-colors">
                          <td className="table-row-cell font-semibold">
                            {r.name}
                          </td>
                          <td className="table-row-cell font-mono text-xs text-brand-dark/70">
                            ${r.stocksVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="table-row-cell">
                            <div className="flex items-center space-x-0.5">
                              <span className="text-brand-dark/40 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={state.bank_amount}
                                onChange={(e) => handleInputChange(r.id, 'bank_amount', e.target.value)}
                                className="w-20 bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell">
                            <div className="flex items-center space-x-0.5">
                              <span className="text-brand-dark/40 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={state.ppf_current}
                                onChange={(e) => handleInputChange(r.id, 'ppf_current', e.target.value)}
                                className="w-20 bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell">
                            <div className="flex items-center space-x-0.5">
                              <span className="text-brand-dark/40 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={state.nps_current}
                                onChange={(e) => handleInputChange(r.id, 'nps_current', e.target.value)}
                                className="w-20 bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono"
                              />
                            </div>
                          </td>
                          <td className="table-row-cell font-mono text-xs text-brand-dark/70">
                            ${r.reVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="table-row-cell font-mono font-bold text-sm">
                            ${r.rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="table-row-cell text-center">
                            {hasChanged && (
                              <button
                                onClick={() => handleSaveProfile(r.id)}
                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors inline-block"
                                title="Save Profile Balances"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {profileSummaryRows.length > 0 && (
                    <tr className="bg-brand-orange/5 font-semibold">
                      <td className="table-row-cell text-brand-orange font-bold">Total Wealth</td>
                      <td className="table-row-cell font-mono text-xs text-brand-orange/90">${totalStocksCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="table-row-cell font-mono text-xs text-brand-orange/90">${totalBankCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="table-row-cell font-mono text-xs text-brand-orange/90">${totalPPFCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="table-row-cell font-mono text-xs text-brand-orange/90">${totalNPSCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="table-row-cell font-mono text-xs text-brand-orange/90">${totalRECurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="table-row-cell font-mono text-base font-extrabold text-brand-orange" colSpan="2">
                        ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
