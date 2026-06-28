import React, { useState, useEffect } from 'react';
import { dbClient } from '../db';
import ProfileCreator from '../components/ProfileCreator';
import { TrendingUp, Plus, Trash2, Save, Check, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import axios from 'axios';

export default function Stocks() {
  const [profiles, setProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'compounded'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New stock form state
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newNominee, setNewNominee] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newAvgPrice, setNewAvgPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Transaction Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('BUY'); // 'BUY' | 'SELL'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [txQuantity, setTxQuantity] = useState('');
  const [txPrice, setTxPrice] = useState('');

  const [editStates, setEditStates] = useState({}); // { companyId: { nominee, bank, avg_price, quantity } }
  const [profileEditStates, setProfileEditStates] = useState({}); // { profileId: name }
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

      // Initialize edit states for profiles
      const profStates = {};
      (profilesData || []).forEach(p => {
        profStates[p.id] = p.name;
      });
      setProfileEditStates(profStates);

      const { data: compData, error: cErr } = await dbClient.companies.listAll();
      if (cErr) {
        setError(cErr.message);
        return;
      }
      setCompanies(compData || []);

      // Initialize edit states
      const states = {};
      (compData || []).forEach(c => {
        states[c.id] = { nominee: c.nominee, bank: c.bank, avg_price: c.avg_price, quantity: c.quantity };
      });
      setEditStates(states);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileNameChange = (profileId, value) => {
    setProfileEditStates(prev => ({
      ...prev,
      [profileId]: value
    }));
  };

  const handleSaveProfileName = async (profileId) => {
    setError('');
    setSuccessMsg('');
    const newName = profileEditStates[profileId];
    if (!newName || !newName.trim()) {
      setError('Profile name cannot be empty.');
      return;
    }

    try {
      const { error: err } = await dbClient.profiles.update(profileId, {
        name: newName.trim()
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Profile name updated successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to update profile name.');
    }
  };

  const handleProfileCreated = (newProfile) => {
    setSuccessMsg('Profile created — it is now available in all sections.');
    fetchData();
    if (newProfile?.id) setSelectedProfileId(newProfile.id);
  };

  const handleRefreshPrices = async () => {
    if (companies.length === 0) return;
    setRefreshing(true);
    setError('');
    setSuccessMsg('');
    try {
      // Get unique symbols
      const symbols = [...new Set(companies.map(c => c.symbol.toUpperCase()))];
      
      // Fetch prices from our API in parallel
      const pricePromises = symbols.map(async (sym) => {
        try {
          const res = await axios.get(`/api/stocks/price?symbol=${sym}`);
          return { symbol: sym, price: res.data.price };
        } catch (e) {
          console.error(`Error fetching price for ${sym}`, e);
          return { symbol: sym, price: null };
        }
      });

      const priceResults = await Promise.all(pricePromises);
      const priceMap = {};
      priceResults.forEach(r => {
        if (r.price !== null) priceMap[r.symbol] = r.price;
      });

      // Update companies with new prices
      let updatedCount = 0;
      for (const comp of companies) {
        const livePrice = priceMap[comp.symbol.toUpperCase()];
        if (livePrice !== undefined && livePrice !== comp.current_price) {
          await dbClient.companies.update(comp.id, { current_price: livePrice });
          updatedCount++;
        }
      }

      setSuccessMsg(`Stock prices refreshed. Updated ${updatedCount} records.`);
      fetchData();
    } catch (err) {
      setError('Failed to refresh stock prices.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!selectedProfileId) {
      setError('Please select a profile first. (Create a profile in Bank page if needed)');
      return;
    }
    if (!newSymbol.trim() || !newCompanyName.trim()) return;

    const avgPrice = parseFloat(newAvgPrice) || 0;
    const quantity = parseFloat(newQuantity) || 0;

    setLoading(true);
    try {
      // Fetch current price for symbol first
      let currentPrice = avgPrice;
      try {
        const res = await axios.get(`/api/stocks/price?symbol=${newSymbol.trim().toUpperCase()}`);
        if (res.data && res.data.price) {
          currentPrice = res.data.price;
        }
      } catch (e) {
        console.warn('Could not fetch current price. Defaulting to avg price.', e);
      }

      const { error: err } = await dbClient.companies.create({
        profile_id: selectedProfileId,
        symbol: newSymbol.trim().toUpperCase(),
        company_name: newCompanyName.trim(),
        nominee: newNominee.trim(),
        bank: newBank.trim(),
        avg_price: avgPrice,
        quantity: quantity,
        current_price: currentPrice
      });

      if (err) {
        setError(err.message);
      } else {
        setNewSymbol('');
        setNewCompanyName('');
        setNewNominee('');
        setNewBank('');
        setNewAvgPrice('');
        setNewQuantity('');
        setSuccessMsg('Stock added successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to add stock.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (companyId, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value
      }
    }));
  };

  const handleSaveCompany = async (companyId) => {
    setError('');
    setSuccessMsg('');
    const state = editStates[companyId];
    const avg_price = parseFloat(state.avg_price);
    const quantity = parseFloat(state.quantity);

    if (isNaN(avg_price) || avg_price < 0 || isNaN(quantity) || quantity < 0) {
      setError('Price and quantity must be valid non-negative numbers.');
      return;
    }

    try {
      const { error: err } = await dbClient.companies.update(companyId, {
        nominee: state.nominee.trim(),
        bank: state.bank.trim(),
        avg_price,
        quantity
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Stock details saved successfully.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to save stock changes.');
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!confirm('Are you sure you want to remove this stock holding?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const { error: err } = await dbClient.companies.delete(companyId);
      if (err) {
        setError(err.message);
      } else {
        setSuccessMsg('Stock holding removed.');
        fetchData();
      }
    } catch (err) {
      setError('Failed to delete stock holding.');
    }
  };

  // Open Buy/Sell Modal
  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setTxQuantity('');
    // For Buy, default to current price, for Sell default to average or current
    setTxPrice(company.current_price || company.avg_price);
    setTxType('BUY');
    setShowTxModal(true);
  };

  const handleExecuteTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!selectedCompany) return;

    const qty = parseFloat(txQuantity);
    const price = parseFloat(txPrice);

    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      setError('Quantity and price must be greater than zero.');
      return;
    }

    const currentQty = parseFloat(selectedCompany.quantity);
    const currentAvg = parseFloat(selectedCompany.avg_price);

    let updatedQty = currentQty;
    let updatedAvg = currentAvg;

    if (txType === 'BUY') {
      updatedQty = currentQty + qty;
      updatedAvg = (currentQty * currentAvg + qty * price) / updatedQty;
    } else {
      // SELL
      if (qty > currentQty) {
        setError(`Insufficient shares. You only own ${currentQty} shares.`);
        return;
      }
      updatedQty = currentQty - qty;
      // Avg remains the same in Sell flow
    }

    setShowTxModal(false);
    setLoading(true);

    try {
      // 1. Update company holding
      const { error: compErr } = await dbClient.companies.update(selectedCompany.id, {
        quantity: updatedQty,
        avg_price: updatedAvg,
        current_price: price // Use transaction price as latest current price
      });

      if (compErr) {
        setError(compErr.message);
        return;
      }

      // 2. Log transaction
      await dbClient.transactions.create({
        profile_id: selectedCompany.profile_id,
        company_id: selectedCompany.id,
        type: txType,
        quantity: qty,
        price: price
      });

      setSuccessMsg(`Successfully executed ${txType} transaction for ${qty} shares of ${selectedCompany.symbol}.`);
      fetchData();
    } catch (err) {
      setError('Transaction execution failed.');
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search query
  const filteredCompanies = companies.filter(c => 
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouped by profile (Personal Stocks)
  const personalStocks = profiles.map(profile => {
    const profileComps = filteredCompanies.filter(c => c.profile_id === profile.id);
    const profileProfit = profileComps.reduce((sum, c) => {
      const profit = (c.current_price * c.quantity) - (c.avg_price * c.quantity);
      return sum + profit;
    }, 0);
    return {
      profile,
      companies: profileComps,
      totalProfit: profileProfit
    };
  });

  // Compounded Stocks Logic (aggregate all profiles by company symbol/name)
  const compoundedStocksMap = {};
  filteredCompanies.forEach(c => {
    const key = c.symbol.toUpperCase();
    if (!compoundedStocksMap[key]) {
      compoundedStocksMap[key] = {
        symbol: c.symbol.toUpperCase(),
        company_name: c.company_name,
        total_quantity: 0,
        weighted_cost_sum: 0,
        current_price: c.current_price
      };
    }
    
    // We update the current price to the latest one seen
    if (c.current_price > 0) {
      compoundedStocksMap[key].current_price = c.current_price;
    }
    compoundedStocksMap[key].total_quantity += parseFloat(c.quantity);
    compoundedStocksMap[key].weighted_cost_sum += parseFloat(c.avg_price) * parseFloat(c.quantity);
  });

  const compoundedStocksList = Object.values(compoundedStocksMap).map(item => {
    const total_quantity = item.total_quantity;
    const avg_price = total_quantity > 0 ? (item.weighted_cost_sum / total_quantity) : 0;
    const profit = (item.current_price * total_quantity) - (avg_price * total_quantity);
    return {
      ...item,
      avg_price,
      profit
    };
  });

  const totalCompoundedProfit = compoundedStocksList.reduce((sum, c) => sum + c.profit, 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-brand-blue/10 rounded-xl text-brand-blue">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-dark">Stock Holdings</h2>
            <p className="text-sm text-brand-dark/50">Track, buy, and sell equities across your profiles</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshPrices}
            disabled={refreshing || companies.length === 0}
            className="flex items-center justify-center space-x-2 bg-brand-blue hover:bg-brand-blue/95 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-brand-blue/10 transition-all duration-200 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Prices'}</span>
          </button>
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

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Toggle tabs */}
        <div className="flex bg-brand-blue/10 p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'personal'
                ? 'bg-white text-brand-dark shadow-xs'
                : 'text-brand-dark/60 hover:text-brand-dark'
            }`}
          >
            Personal Stocks
          </button>
          <button
            onClick={() => setActiveTab('compounded')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'compounded'
                ? 'bg-white text-brand-dark shadow-xs'
                : 'text-brand-dark/60 hover:text-brand-dark'
            }`}
          >
            Compounded Statement
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/40" />
          <input
            type="text"
            placeholder="Search stocks (AAPL, Tesla)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Profile Creator — always show so users can create profiles from Stocks page */}
      {activeTab === 'personal' && (
        <ProfileCreator
          onCreated={handleProfileCreated}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Add Stock Form (only visible in Personal view when profiles exist) */}
      {activeTab === 'personal' && profiles.length > 0 && (
        <div className="bg-white border border-brand-border/60 p-5 rounded-2xl shadow-xs">
          <h3 className="text-sm font-semibold text-brand-dark/70 mb-4">Add Company Holding</h3>
          <form onSubmit={handleAddStock} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              <label className="text-xs font-semibold text-brand-dark/60">Stock Symbol</label>
              <input
                type="text"
                placeholder="e.g. AAPL"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Apple Inc."
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Nominee</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={newNominee}
                onChange={(e) => setNewNominee(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Broker Bank</label>
              <input
                type="text"
                placeholder="e.g. Chase"
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Average Buy Price</label>
              <input
                type="number"
                step="0.0001"
                placeholder="e.g. 150.25"
                value={newAvgPrice}
                onChange={(e) => setNewAvgPrice(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-brand-dark/60">Quantity</label>
              <input
                type="number"
                step="0.0001"
                placeholder="e.g. 10"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="text-sm rounded-xl px-3 py-2"
                required
              />
            </div>

            <div className="sm:col-span-2 md:col-span-1 flex items-end">
              <button
                type="submit"
                className="flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange/95 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-brand-orange/20 transition-all duration-200 text-sm w-full"
              >
                <Plus className="w-4 h-4" />
                <span>Add Holding</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-brand-dark/50">Loading stock information...</div>
      ) : (
        <div className="space-y-8">
          {profiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-brand-border/60 text-brand-dark/50">
              No profiles found. Please create a profile in the Bank Accounts page first.
            </div>
          ) : (
            <>
              {/* VIEW: Personal Stocks */}
              {activeTab === 'personal' && (
                personalStocks.map(({ profile, companies: profileComps }) => {
                  const profileInvested = profileComps.reduce((sum, c) => sum + (c.avg_price * c.quantity), 0);
                  const profileCurrentVal = profileComps.reduce((sum, c) => sum + (c.current_price * c.quantity), 0);
                  const profileProfit = profileCurrentVal - profileInvested;

                  return (
                    <div key={profile.id} className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={profileEditStates[profile.id] !== undefined ? profileEditStates[profile.id] : profile.name}
                            onChange={(e) => handleProfileNameChange(profile.id, e.target.value)}
                            className="bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-lg font-bold text-brand-dark w-48"
                          />
                          {profileEditStates[profile.id] !== undefined && profileEditStates[profile.id] !== profile.name && (
                            <button
                              onClick={() => handleSaveProfileName(profile.id)}
                              className="p-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                              title="Save Profile Name"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${profileProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          Profile P&L: {profileProfit >= 0 ? '+' : ''}${profileProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="table-container">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-brand-blue/5">
                              <th className="table-header-cell w-1/12">Symbol</th>
                              <th className="table-header-cell w-3/12">Company (Buy/Sell)</th>
                              <th className="table-header-cell w-2/12">Nominee</th>
                              <th className="table-header-cell w-2/12">Bank</th>
                              <th className="table-header-cell w-1/12">Avg Price</th>
                              <th className="table-header-cell w-1/12">Quantity</th>
                              <th className="table-header-cell w-1/12">Current</th>
                              <th className="table-header-cell w-1/12">P&L</th>
                              <th className="table-header-cell text-center w-1/12">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profileComps.length === 0 ? (
                              <tr>
                                <td colSpan="9" className="table-row-cell text-center text-brand-dark/50 py-6">
                                  No stocks holdings listed for this profile yet.
                                </td>
                              </tr>
                            ) : (
                              profileComps.map((c) => {
                                const state = editStates[c.id] || { nominee: c.nominee, bank: c.bank, avg_price: c.avg_price, quantity: c.quantity };
                                const hasChanged = state.nominee !== c.nominee || 
                                  state.bank !== c.bank || 
                                  parseFloat(state.avg_price) !== parseFloat(c.avg_price) ||
                                  parseFloat(state.quantity) !== parseFloat(c.quantity);

                                const profit = (parseFloat(c.current_price) * parseFloat(state.quantity)) - (parseFloat(state.avg_price) * parseFloat(state.quantity));

                                return (
                                  <tr key={c.id} className="hover:bg-brand-blue/5 transition-colors">
                                    <td className="table-row-cell font-mono font-bold text-xs">
                                      {c.symbol}
                                    </td>
                                    <td className="table-row-cell">
                                      <button
                                        onClick={() => handleCompanyClick(c)}
                                        className="text-left font-semibold text-brand-orange hover:underline focus:outline-none"
                                        title="Click to Buy/Sell shares"
                                      >
                                        {c.company_name}
                                      </button>
                                    </td>
                                    <td className="table-row-cell">
                                      <input
                                        type="text"
                                        value={state.nominee}
                                        onChange={(e) => handleInputChange(c.id, 'nominee', e.target.value)}
                                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm"
                                      />
                                    </td>
                                    <td className="table-row-cell">
                                      <input
                                        type="text"
                                        value={state.bank}
                                        onChange={(e) => handleInputChange(c.id, 'bank', e.target.value)}
                                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm"
                                      />
                                    </td>
                                    <td className="table-row-cell font-mono">
                                      <div className="flex items-center space-x-0.5">
                                        <span className="text-brand-dark/40 text-xs">$</span>
                                        <input
                                          type="number"
                                          step="0.0001"
                                          value={state.avg_price}
                                          onChange={(e) => handleInputChange(c.id, 'avg_price', e.target.value)}
                                          className="w-16 bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono"
                                        />
                                      </div>
                                    </td>
                                    <td className="table-row-cell font-mono">
                                      <input
                                        type="number"
                                        step="0.0001"
                                        value={state.quantity}
                                        onChange={(e) => handleInputChange(c.id, 'quantity', e.target.value)}
                                        className="w-16 bg-transparent border-0 border-b border-transparent focus:border-brand-blue rounded-none px-0 py-0.5 focus:ring-0 text-sm font-mono"
                                      />
                                    </td>
                                    <td className="table-row-cell font-mono text-xs">
                                      ${parseFloat(c.current_price).toFixed(2)}
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
                                            onClick={() => handleSaveCompany(c.id)}
                                            className="p-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                            title="Save Changes"
                                          >
                                            <Save className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteCompany(c.id)}
                                          className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                          title="Remove Stock"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
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
                  );
                })
              )}

              {/* VIEW: Compounded Stocks */}
              {activeTab === 'compounded' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-lg font-bold text-brand-dark font-sans">Compounded Statement (Aggregated)</h3>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${totalCompoundedProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      Total Compounded Profit: {totalCompoundedProfit >= 0 ? '+' : ''}${totalCompoundedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="table-container">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-brand-blue/5">
                          <th className="table-header-cell w-1/6">Symbol</th>
                          <th className="table-header-cell w-2/6">Company Name</th>
                          <th className="table-header-cell w-1/6">Total Quantity</th>
                          <th className="table-header-cell w-1/6">Weighted Avg Cost</th>
                          <th className="table-header-cell w-1/6">Current Price</th>
                          <th className="table-header-cell w-1/6">Total Profit / Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compoundedStocksList.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="table-row-cell text-center text-brand-dark/50 py-6">
                              No company assets available.
                            </td>
                          </tr>
                        ) : (
                          compoundedStocksList.map((item) => (
                            <tr key={item.symbol} className="hover:bg-brand-blue/5 transition-colors">
                              <td className="table-row-cell font-mono font-bold">
                                {item.symbol}
                              </td>
                              <td className="table-row-cell font-semibold">
                                {item.company_name}
                              </td>
                              <td className="table-row-cell font-mono">
                                {item.total_quantity.toFixed(4)}
                              </td>
                              <td className="table-row-cell font-mono">
                                ${item.avg_price.toFixed(4)}
                              </td>
                              <td className="table-row-cell font-mono">
                                ${item.current_price.toFixed(2)}
                              </td>
                              <td className="table-row-cell font-mono font-bold">
                                <span className={item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  {item.profit >= 0 ? '+' : ''}${item.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                        {compoundedStocksList.length > 0 && (
                          <tr className="bg-brand-orange/5 font-semibold">
                            <td className="table-row-cell text-brand-orange font-bold" colSpan="2">
                              Total Portfolio Aggregates
                            </td>
                            <td className="table-row-cell" colSpan="3"></td>
                            <td className="table-row-cell font-mono font-extrabold text-brand-orange">
                              <span className={totalCompoundedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                {totalCompoundedProfit >= 0 ? '+' : ''}${totalCompoundedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Buy / Sell Transaction Modal */}
      {showTxModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-brand-border/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-brand-blue/10 px-6 py-4 flex justify-between items-center border-b border-brand-border/40">
              <h3 className="font-bold text-brand-dark">
                Execute Transaction: {selectedCompany.symbol}
              </h3>
              <button 
                onClick={() => setShowTxModal(false)}
                className="text-brand-dark/50 hover:text-brand-dark font-bold px-2 py-1 hover:bg-brand-blue/10 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleExecuteTransaction} className="p-6 space-y-4">
              <div className="flex bg-brand-light p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('BUY')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    txType === 'BUY' 
                      ? 'bg-brand-orange text-white shadow-xs' 
                      : 'text-brand-dark/60 hover:text-brand-dark'
                  }`}
                >
                  Buy Shares
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('SELL')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    txType === 'SELL' 
                      ? 'bg-red-500 text-white shadow-xs' 
                      : 'text-brand-dark/60 hover:text-brand-dark'
                  }`}
                >
                  Sell Shares
                </button>
              </div>

              <div className="space-y-3 bg-brand-light/50 p-4 rounded-xl border border-brand-border/40 text-xs text-brand-dark/70">
                <div className="flex justify-between">
                  <span>Current Holding:</span>
                  <span className="font-mono font-semibold">{selectedCompany.quantity} shares</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Avg Price:</span>
                  <span className="font-mono font-semibold">${parseFloat(selectedCompany.avg_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Live Price:</span>
                  <span className="font-mono font-semibold">${parseFloat(selectedCompany.current_price).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-brand-dark/60">
                    Quantity to {txType === 'BUY' ? 'Purchase' : 'Sell'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 5"
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value)}
                    className="text-sm rounded-xl"
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-brand-dark/60">
                    Transaction Price per Share ($)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 175.50"
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    className="text-sm rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 py-3 border border-brand-border text-sm font-semibold rounded-xl text-brand-dark/70 hover:bg-brand-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl text-white shadow-md transition-all ${
                    txType === 'BUY' 
                      ? 'bg-brand-orange hover:bg-brand-orange/95 shadow-brand-orange/20' 
                      : 'bg-red-500 hover:bg-red-550 shadow-red-500/20'
                  }`}
                >
                  Confirm {txType === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
