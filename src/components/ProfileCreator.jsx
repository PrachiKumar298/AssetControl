import React, { useState } from 'react';
import { dbClient } from '../db';
import { Plus, UserPlus } from 'lucide-react';

/**
 * Reusable "Create New Profile" panel.
 *
 * Props:
 *  - onCreated(profile) — called after a profile is successfully created
 *  - onError(msg)       — called if creation fails
 */
export default function ProfileCreator({ onCreated, onError }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await dbClient.profiles.create(name.trim());
      if (error) {
        onError?.(error.message);
      } else {
        setName('');
        onCreated?.(data);
      }
    } catch (err) {
      onError?.('Failed to create profile.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white border border-brand-border/60 p-5 rounded-2xl shadow-xs">
      <div className="flex items-center space-x-2 mb-3">
        <UserPlus className="w-4 h-4 text-brand-orange" />
        <h3 className="text-sm font-semibold text-brand-dark/70">
          Create New Investment Profile
        </h3>
      </div>
      <p className="text-xs text-brand-dark/40 mb-3">
        Profiles are shared across all sections — Bank, Stocks, PPF, NPS, and Real Estate.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="e.g. Retirement, Self, Spouse"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 text-sm rounded-xl px-4 py-3"
          required
          disabled={creating}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex items-center justify-center space-x-2 bg-brand-orange hover:bg-brand-orange/95 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-brand-orange/20 transition-all duration-200 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Creating...' : 'Create Profile'}</span>
        </button>
      </form>
    </div>
  );
}
