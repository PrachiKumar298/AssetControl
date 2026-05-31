import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Landmark, 
  FileText, 
  Home, 
  LogOut, 
  Menu, 
  X, 
  UserCircle 
} from 'lucide-react';
import { dbClient } from '../db';

export default function Navigation({ user, onSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dbClient.auth.signOut();
    onSignOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'Bank Accounts', path: '/bank', icon: Landmark },
    { name: 'PPF', path: '/ppf', icon: FileText },
    { name: 'NPS', path: '/nps', icon: FileText },
    { name: 'Real Estate', path: '/real-estate', icon: Home },
  ];

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-brand-border/60 px-5 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center font-bold text-white shadow-sm text-sm">
            AG
          </div>
          <span className="font-semibold text-brand-dark tracking-tight">Antigravity Wealth</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-brand-dark p-1 rounded-md hover:bg-brand-blue/10 focus:outline-none"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-brand-border/60 p-6 flex flex-col justify-between transition-transform duration-300
        md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        pt-20 md:pt-6
      `}>
        <div className="flex flex-col space-y-8">
          {/* Logo / Brand (hidden on mobile header since it's already there) */}
          <div className="hidden md:flex items-center space-x-3 px-2">
            <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center font-extrabold text-white shadow-md text-lg">
              AG
            </div>
            <div>
              <h1 className="font-bold text-brand-dark text-lg tracking-tight leading-none">Antigravity</h1>
              <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Wealth Manager</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-orange text-white shadow-sm shadow-brand-orange/20' 
                      : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-blue/10'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-brand-blue'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile details and Logout */}
        <div className="border-t border-brand-border/60 pt-4 flex flex-col space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <UserCircle className="w-9 h-9 text-brand-blue" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-brand-dark truncate">{username}</p>
              <p className="text-xs text-brand-dark/50 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full text-left"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-brand-dark/30 z-30 md:hidden backdrop-blur-xs"
        />
      )}
    </>
  );
}
