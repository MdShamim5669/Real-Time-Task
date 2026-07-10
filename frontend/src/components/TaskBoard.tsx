import React, { useState, useEffect, useRef } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import VoiceAssistantModal from './VoiceAssistantModal';
import AutomationModal from './AutomationModal';
import CalendarModal from './CalendarModal';
import { safeStorage } from '../utils/storage';
import { Plus, Search, Filter, LogOut, CheckCircle, Clock, Kanban, ListTodo, LogIn, Sparkles, Sun, Moon, Mic, BellRing, Mail, X, Calendar } from 'lucide-react';

interface TaskBoardProps {
  currentUser: any;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function TaskBoard({ currentUser, theme, onToggleTheme }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [automationToast, setAutomationToast] = useState<{ id: string; title: string; message: string; recipient: string } | null>(null);

  // Email verification state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    setSendingVerification(true);
    setVerificationError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
    } catch (err: any) {
      console.error('Email verification error:', err);
      setVerificationError(err.message || 'Failed to send verification email.');
    } finally {
      setSendingVerification(false);
    }
  };

  // Keep track of tasks we have notified in this session to prevent repeated toasts
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);

  // Drag and Drop States
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<'before' | 'after' | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // Subscribe to real-time Tasks updates (Pillar 8 sync)
  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          assigneeId: data.assigneeId,
          assigneeEmail: data.assigneeEmail,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setTasks(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, []);

  // Automated background checker for approaching task deadlines
  useEffect(() => {
    const isSimEnabled = safeStorage.getItem('deadline_alerts_sim_enabled') !== 'false';
    if (!isSimEnabled || tasks.length === 0) return;

    const now = new Date();
    const currentUnnotified = tasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      if (notifiedTaskIdsRef.current.has(task.id)) return false;

      const due = new Date(`${task.dueDate}T23:59:59`);
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Triggers if task is overdue or due within next 48 hours
      return diffHours <= 48;
    });

    if (currentUnnotified.length > 0) {
      const taskToNotify = currentUnnotified[0]; // Notify one-by-one to avoid spam
      const recipient = taskToNotify.assigneeEmail || taskToNotify.ownerEmail || currentUser.email;
      
      const due = new Date(`${taskToNotify.dueDate}T23:59:59`);
      const diffMs = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays <= 0;

      // Add to notifications ref so we don't repeat
      notifiedTaskIdsRef.current.add(taskToNotify.id);

      // Store in localStorage logs
      const savedLogs = safeStorage.getItem('simulated_email_logs');
      let emailLogs = [];
      try {
        emailLogs = savedLogs ? JSON.parse(savedLogs) : [];
      } catch (err) {
        console.error("Failed to parse simulated email logs:", err);
      }
      
      const subject = isOverdue 
        ? `⚠️ [OVERDUE ALERT] Task deadline has passed: "${taskToNotify.title}"`
        : `⏰ [URGENT] Task deadline approaching: "${taskToNotify.title}"`;

      // Simple HTML snippet for email log preview
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
          <h2 style="color: #4f46e5; margin-top: 0;">⏰ Deadline alert!</h2>
          <p style="margin: 10px 0; color: #334155;"><strong>Task:</strong> ${taskToNotify.title}</p>
          <p style="margin: 10px 0; color: #334155;"><strong>Due Date:</strong> <span style="color: ${isOverdue ? '#f43f5e' : '#4f46e5'}; font-weight: bold;">${taskToNotify.dueDate} ${isOverdue ? '(OVERDUE!)' : ''}</span></p>
          <p style="margin: 10px 0; color: #64748b;"><strong>Recipient:</strong> ${recipient}</p>
        </div>
      `;

      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        taskId: taskToNotify.id,
        taskTitle: taskToNotify.title,
        recipient,
        subject,
        sentAt: now.toLocaleTimeString() + ' ' + now.toLocaleDateString(),
        status: 'delivered' as const,
        htmlBody
      };

      safeStorage.setItem('simulated_email_logs', JSON.stringify([newLog, ...emailLogs]));

      // Display in-app toast notification
      setAutomationToast({
        id: newLog.id,
        title: isOverdue ? 'Overdue Deadline Email Sent' : 'Upcoming Deadline Email Sent',
        message: `Automated alert email successfully delivered to ${recipient} for task "${taskToNotify.title}".`,
        recipient
      });

      // Clear toast after 6 seconds
      const timer = setTimeout(() => {
        setAutomationToast(null);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [tasks, currentUser.email]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropTargetId(null);
    setDropPlacement(null);
    setActiveColumnId(null);
  };

  const handleDragOverCard = (e: React.DragEvent, targetTask: Task) => {
    if (!draggedTask || draggedTask.id === targetTask.id) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const isUpper = offset < rect.height / 2;
    const placement = isUpper ? 'before' : 'after';

    setDropTargetId(targetTask.id);
    setDropPlacement(placement);
    setActiveColumnId(targetTask.status);
  };

  const handleDropOnCard = async (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTask || draggedTask.id === targetTask.id) return;

    // Get the sorted tasks for the target status column
    const colTasks = filteredTasks
      .filter((t) => t.status === targetTask.status)
      .sort((a, b) => {
        const posA = a.position ?? (a.createdAt?.seconds ? -a.createdAt.seconds : 0);
        const posB = b.position ?? (b.createdAt?.seconds ? -b.createdAt.seconds : 0);
        return posA - posB;
      });

    const targetIndex = colTasks.findIndex((t) => t.id === targetTask.id);
    if (targetIndex === -1) return;

    let newPosition: number;
    const getTaskPosVal = (t: Task) => t.position ?? (t.createdAt?.seconds ? -t.createdAt.seconds : 0);

    if (dropPlacement === 'before') {
      if (targetIndex === 0) {
        newPosition = getTaskPosVal(targetTask) - 1000;
      } else {
        const prevTask = colTasks[targetIndex - 1];
        newPosition = (getTaskPosVal(prevTask) + getTaskPosVal(targetTask)) / 2;
      }
    } else {
      if (targetIndex === colTasks.length - 1) {
        newPosition = getTaskPosVal(targetTask) + 1000;
      } else {
        const nextTask = colTasks[targetIndex + 1];
        newPosition = (getTaskPosVal(targetTask) + getTaskPosVal(nextTask)) / 2;
      }
    }

    try {
      const taskRef = doc(db, 'tasks', draggedTask.id);
      await updateDoc(taskRef, {
        status: targetTask.status,
        position: newPosition,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${draggedTask.id}`);
    } finally {
      handleDragEnd();
    }
  };

  const handleDragOverColumn = (e: React.DragEvent, colId: string) => {
    if (!draggedTask) return;
    e.preventDefault();
    setActiveColumnId(colId);
  };

  const handleDropOnColumn = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    // If dropTargetId is active, card-level drop takes priority
    if (dropTargetId) return;

    const colTasks = filteredTasks
      .filter((t) => t.status === colId)
      .sort((a, b) => {
        const posA = a.position ?? (a.createdAt?.seconds ? -a.createdAt.seconds : 0);
        const posB = b.position ?? (b.createdAt?.seconds ? -b.createdAt.seconds : 0);
        return posA - posB;
      });

    let newPosition: number;
    const getTaskPosVal = (t: Task) => t.position ?? (t.createdAt?.seconds ? -t.createdAt.seconds : 0);

    if (colTasks.length === 0) {
      newPosition = 1000;
    } else {
      const lastTask = colTasks[colTasks.length - 1];
      newPosition = getTaskPosVal(lastTask) + 1000;
    }

    try {
      const taskRef = doc(db, 'tasks', draggedTask.id);
      await updateDoc(taskRef, {
        status: colId as any,
        position: newPosition,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${draggedTask.id}`);
    } finally {
      handleDragEnd();
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // Filter tasks based on query
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(search.toLowerCase());

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    const matchesOwnerOrAssignee =
      !onlyMyTasks ||
      task.ownerId === currentUser.uid ||
      task.assigneeId === currentUser.uid;

    return matchesSearch && matchesPriority && matchesOwnerOrAssignee;
  });

  const overdueCount = (() => {
    const now = new Date();
    return tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false;
      const [year, month, day] = task.dueDate.split('-').map(Number);
      const d = new Date(year, month - 1, day, 23, 59, 59); // end of that day
      return d < now;
    }).length;
  })();

  const columns = [
    { id: 'todo', title: 'To Do', icon: ListTodo, color: 'text-indigo-400' },
    { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-amber-400' },
    { id: 'done', title: 'Completed', icon: CheckCircle, color: 'text-emerald-400' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
      {/* Decorative cosmic background highlights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="bg-white/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md">
            <Kanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Task Board</span>
              <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wide uppercase">Collaborative Space</p>
          </div>
        </div>

        {/* User profile & Switchers & Sign Out */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{currentUser.displayName || 'Developer'}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{currentUser.email}</span>
          </div>

          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt="User avatar" referrerPolicy="no-referrer" className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
          ) : (
            <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-500 dark:text-indigo-400">
              {currentUser.email.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Automation / Cloud Functions center */}
          <button
            onClick={() => setIsAutomationOpen(true)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 cursor-pointer flex items-center justify-center relative"
            title="Automated Email Alerts / Firebase Functions Control"
          >
            <BellRing className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
          </button>

          {/* Google Calendar Hub */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 cursor-pointer flex items-center justify-center relative"
            title="Google Calendar Hub / Deadline Sync"
          >
            <Calendar className="h-5 w-5 text-red-500 dark:text-red-400" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse" />
          </button>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 cursor-pointer flex items-center justify-center"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <button
            onClick={handleSignOut}
            className="p-2.5 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 dark:text-slate-500 rounded-xl border border-transparent hover:border-rose-500/20 transition-all duration-300 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Control / Filter Bar */}
      <section className="max-w-7xl mx-auto w-full px-6 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, descriptions..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-sm"
            />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer appearance-none min-w-[140px] shadow-sm"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          {/* "My Tasks" checkbox */}
          <label className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors select-none shadow-sm">
            <input
              type="checkbox"
              checked={onlyMyTasks}
              onChange={(e) => setOnlyMyTasks(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-white dark:focus:ring-offset-slate-950 cursor-pointer"
            />
            <span>My Tasks</span>
          </label>
        </div>

        {/* Create task actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 dark:hover:border-indigo-900 font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm dark:shadow-md transition-all duration-300 cursor-pointer"
            title="Create task via Voice Commands"
          >
            <Mic className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Voice Command</span>
          </button>

          <button
            onClick={() => {
              setSelectedTask(null);
              setIsModalOpen(true);
            }}
            className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all duration-300 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>New Task</span>
          </button>
        </div>
      </section>

      {/* Overdue Tasks Alert Banner */}
      {overdueCount > 0 && (
        <div className="max-w-7xl mx-auto w-full px-6 mb-4">
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-500/5">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚨</span>
              <p className="font-semibold">
                Warning: You have {overdueCount} task{overdueCount > 1 ? 's' : ''} overdue! Please review and update deadlines or complete them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Verification Banner */}
      {!currentUser.emailVerified && (
        <div className="max-w-7xl mx-auto w-full px-6 mb-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span>⚠️</span>
              <p>
                Your email is not verified on this login. You can browse tasks in read-only mode, but creation/updates require a verified email address on your auth token.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {verificationSent ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                  Verification Email Sent! Check your inbox.
                </span>
              ) : (
                <button
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  {sendingVerification ? 'Sending...' : 'Verify Email'}
                </button>
              )}
            </div>
          </div>
          {verificationError && (
            <div className="mt-2 text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-xl">
              {verificationError}
            </div>
          )}
        </div>
      )}

      {/* Main Kanban Board Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pb-12 relative z-10">
        <LayoutGroup>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
            {columns.map((col) => {
              const colTasks = filteredTasks
                .filter((task) => task.status === col.id)
                .sort((a, b) => {
                  const posA = a.position ?? (a.createdAt?.seconds ? -a.createdAt.seconds : 0);
                  const posB = b.position ?? (b.createdAt?.seconds ? -b.createdAt.seconds : 0);
                  return posA - posB;
                });
              const IconComp = col.icon;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOverColumn(e, col.id)}
                  onDrop={(e) => handleDropOnColumn(e, col.id)}
                  className={`bg-slate-100/50 dark:bg-slate-900/30 border rounded-3xl p-5 flex flex-col h-[540px] lg:h-[calc(100vh-290px)] lg:min-h-[520px] lg:max-h-[720px] transition-all duration-300 ${
                    activeColumnId === col.id && draggedTask
                      ? 'border-indigo-500/50 bg-slate-200/50 dark:bg-slate-900/60 shadow-xl shadow-indigo-500/5'
                      : 'border-slate-200 dark:border-slate-800/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-slate-800/50">
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`h-5 w-5 ${col.color}`} />
                      <h2 className="text-base font-bold text-slate-800 dark:text-white">{col.title}</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-mono">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                    {colTasks.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-6">
                        <p className="text-xs">No tasks here</p>
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          {/* Drop Indicator before this task */}
                          {draggedTask && dropTargetId === task.id && dropPlacement === 'before' && (
                            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)] animate-pulse" />
                          )}

                          <TaskCard
                            task={task}
                            currentUser={currentUser}
                            isDragging={draggedTask?.id === task.id}
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverCard(e, task)}
                            onDrop={(e) => handleDropOnCard(e, task)}
                            onEdit={(t) => {
                              setSelectedTask(t);
                              setIsModalOpen(true);
                            }}
                          />

                          {/* Drop Indicator after this task */}
                          {draggedTask && dropTargetId === task.id && dropPlacement === 'after' && (
                            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)] animate-pulse" />
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </LayoutGroup>
      </main>

      {/* Task Modal (Create / Edit & real-time Comments) */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        currentUser={currentUser}
        theme={theme}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentUser={currentUser}
        theme={theme}
      />

      {/* Automation & Firebase Functions Center */}
      <AutomationModal
        isOpen={isAutomationOpen}
        onClose={() => setIsAutomationOpen(false)}
        tasks={tasks}
        currentUser={currentUser}
        theme={theme}
      />

      {/* Google Calendar Hub Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        tasks={tasks}
        theme={theme}
      />

      {/* Toast Notification for Simulated Automated Emails */}
      <AnimatePresence>
        {automationToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-4 rounded-2xl border border-slate-800 dark:border-slate-200 shadow-2xl flex gap-3.5 max-w-sm items-start"
          >
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl mt-0.5">
              <Mail className="h-5 w-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white dark:text-slate-900 flex items-center gap-2">
                <span>{automationToast.title}</span>
                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-ping" />
              </h4>
              <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1 leading-relaxed">
                {automationToast.message}
              </p>
              <button
                onClick={() => {
                  setIsAutomationOpen(true);
                  setAutomationToast(null);
                }}
                className="mt-2.5 text-[10px] font-bold text-indigo-400 dark:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Automation Logs</span>
              </button>
            </div>
            <button
              onClick={() => setAutomationToast(null)}
              className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded text-slate-400 dark:text-slate-500 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
