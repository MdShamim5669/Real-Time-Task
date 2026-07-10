// Next.js Dashboard Layout with Persistent Responsive Sidebar Navigation
'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  Wallet, 
  CalendarDays, 
  Users, 
  History, 
  Menu, 
  X,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navItems: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    description: 'Overview of system status'
  },
  { 
    name: 'Meals Management', 
    href: '/meals', 
    icon: Utensils,
    description: 'Daily meals tracker'
  },
  { 
    name: 'Expenses Tracker', 
    href: '/expenses', 
    icon: Receipt,
    description: 'Mess budget & billing'
  },
  { 
    name: 'Deposits Ledger', 
    href: '/deposits', 
    icon: Wallet,
    description: 'Member fund ledger'
  },
  { 
    name: 'Duty Roster', 
    href: '/roster', 
    icon: CalendarDays,
    description: 'Market & cooking shifts'
  },
  { 
    name: 'Members Directory', 
    href: '/members', 
    icon: Users,
    description: 'Mess members & roles'
  },
  { 
    name: 'Activity History', 
    href: '/history', 
    icon: History,
    description: 'Past cycles & logs'
  }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
      
      const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
      };
      
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Desktop Sidebar (Persistent left side) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Brand Header */}
          <div className="flex items-center h-16 px-6 border-b border-slate-200 dark:border-slate-800 gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-950 dark:text-white leading-none">MessManager</h1>
              <span className="text-[10px] text-slate-500 font-medium">Realtime Dashboard</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-505'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate leading-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-505 font-normal truncate mt-0.5 leading-none">
                      {item.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                </a>
              );
            })}
          </nav>

          {/* Profile Section Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm">
                TS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">Samim Islam</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-505 truncate mt-0.5">Manager</p>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* Mobile Header and Sliding Menu */}
      <div className="md:hidden flex flex-col w-full min-h-screen">
        <header className="flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-sm">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-950 dark:text-white leading-none">MessManager</h1>
              <span className="text-[9px] text-slate-500 font-medium">Realtime Dashboard</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile Slide-Over Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop overlay with blur */}
            <div 
              className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar drawer body */}
            <div className="relative flex flex-col w-full max-w-xs bg-white dark:bg-slate-900 h-full p-4 shadow-xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h1 className="text-xs font-bold text-slate-950 dark:text-white leading-none">MessManager</h1>
                    <span className="text-[9px] text-slate-505 font-medium">Realtime Dashboard</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links (Mobile) */}
              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = currentPath === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-505'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate leading-tight text-xs">{item.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-505 font-normal truncate mt-0.5 leading-none">
                          {item.description}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </nav>

              {/* User Footer (Mobile) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    TS
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">Samim Islam</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-550">Manager</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile main viewport */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>

      {/* Desktop Viewport content adjustment (with padding for fixed sidebar) */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:pl-64 lg:pl-72">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

