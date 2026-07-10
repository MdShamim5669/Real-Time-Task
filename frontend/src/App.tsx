import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import AuthScreen from './components/AuthScreen';
import TaskBoard from './components/TaskBoard';
import { Sparkles, Loader } from 'lucide-react';
import { safeStorage } from './utils/storage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    safeStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error('Auth state listener error:', error);
        setErrorMsg('Failed to listen to authentication changes.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col items-center justify-center font-sans transition-colors duration-300">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
          <Loader className="h-10 w-10 text-indigo-500 animate-spin relative z-10" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase mt-4 animate-pulse flex items-center gap-1.5">
          <span>Securing Channel</span>
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-6 rounded-3xl max-w-md text-center shadow-xl">
          <p className="font-bold mb-2">System Authentication Error</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onLoading={setLoading}
        onError={setErrorMsg}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <TaskBoard
      currentUser={user}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
