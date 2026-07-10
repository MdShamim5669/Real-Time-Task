import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { safeStorage } from '../utils/storage';
import { X, Sparkles, Code, Play, CheckCircle2, Copy, Check, ExternalLink, AlertTriangle, Eye, Mail, Info, BellRing, Settings } from 'lucide-react';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  currentUser: any;
  theme: 'light' | 'dark';
}

interface SimulatedEmail {
  id: string;
  taskId: string;
  taskTitle: string;
  recipient: string;
  subject: string;
  sentAt: string;
  status: 'delivered' | 'failed';
  htmlBody: string;
}

function SafeHtmlRenderer({ html }: { html: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    containerRef.current.innerHTML = '';
    
    try {
      const shadowRoot = containerRef.current.attachShadow({ mode: 'open' });
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.minHeight = '100%';
      div.style.backgroundColor = '#f8fafc';
      div.style.color = '#0f172a';
      div.innerHTML = html;
      shadowRoot.appendChild(div);
    } catch (e) {
      containerRef.current.innerHTML = html;
    }
  }, [html]);

  return <div ref={containerRef} className="w-full h-full overflow-auto bg-[#f8fafc] text-[#0f172a]" />;
}

export default function AutomationModal({ isOpen, onClose, tasks, currentUser, theme }: AutomationModalProps) {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code'>('simulator');
  const [isCopied, setIsCopied] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);

  // Simulation settings stored in localStorage
  const [isSimulationEnabled, setIsSimulationEnabled] = useState<boolean>(() => {
    return safeStorage.getItem('deadline_alerts_sim_enabled') !== 'false';
  });

  // Simulated email delivery log
  const [emailLogs, setEmailLogs] = useState<SimulatedEmail[]>(() => {
    const saved = safeStorage.getItem('simulated_email_logs');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse simulated email logs:", e);
      return [];
    }
  });

  useEffect(() => {
    safeStorage.setItem('deadline_alerts_sim_enabled', String(isSimulationEnabled));
  }, [isSimulationEnabled]);

  useEffect(() => {
    safeStorage.setItem('simulated_email_logs', JSON.stringify(emailLogs));
  }, [emailLogs]);

  const clearLogs = () => {
    setEmailLogs([]);
    setSelectedEmail(null);
  };

  // Helper: check if a date string is "approaching"
  // Approaching is defined as: Due date is in the future but within the next 48 hours, or overdue, and status is NOT done.
  const getApproachingTasks = () => {
    const now = new Date();
    return tasks.filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      const due = new Date(`${task.dueDate}T23:59:59`);
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Overdue (diffHours < 0) or due within next 48 hours
      return diffHours <= 48;
    });
  };

  const approachingTasks = getApproachingTasks();

  // Generate HTML preview for the alert email
  const generateEmailHtml = (task: Task, daysRemaining: number) => {
    const isOverdue = daysRemaining < 0;
    const priorityColor = task.priority === 'high' ? '#f43f5e' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6';
    const statusText = task.status === 'in_progress' ? 'In Progress' : 'To Do';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Task Deadline Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; bg-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; background: #ffffff;">
            
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 35px 25px; text-align: center;">
              <span style="font-size: 40px; display: inline-block; margin-bottom: 10px;">⏰</span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Deadline Approaching!</h1>
              <p style="color: #c7d2fe; margin: 5px 0 0 0; font-size: 14px;">Firebase Cloud Functions - Automated Task Manager</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 30px 25px;">
              <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">
                Hello,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569;">
                This is an automated alert from your collaborative Task Board. The following task assigned to you has an approaching deadline:
              </p>

              <!-- Task Card Details -->
              <div style="background-color: #f1f5f9; border-left: 5px solid #4f46e5; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">
                  Task details
                </div>
                <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 10px 0; font-weight: 600;">
                  ${task.title}
                </h2>
                <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; line-height: 1.5; font-style: ${task.description ? 'normal' : 'italic'}">
                  ${task.description || 'No description provided.'}
                </p>

                <!-- Key value row -->
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 100px;">Priority:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: ${priorityColor}; text-transform: capitalize;">
                      ● ${task.priority}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Current Status:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: #1e293b;">
                      ${statusText}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: ${isOverdue ? '#f43f5e' : '#4f46e5'};">
                      ${task.dueDate} ${isOverdue ? '(Overdue!)' : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Call To Action Button -->
              <div style="text-align: center; margin: 30px 0 15px 0;">
                <a href="https://ais-pre-i6wfnmedrv3nqkc2ty6mcn-200841564060.asia-southeast1.run.app/" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: 600; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);">
                  View Task on Dashboard
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px 25px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 5px 0;">Generated by Firebase Cloud Functions triggers.</p>
              <p style="margin: 0;">To disable these notifications, please update your system preferences.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Run the manual trigger of the cloud function simulation
  const handleTriggerSimulation = () => {
    if (approachingTasks.length === 0) {
      alert("No tasks currently match the deadline criteria (due within 48 hours or overdue). Create or adjust a task's due date to trigger the simulation!");
      return;
    }

    const newLogs: SimulatedEmail[] = [];
    const now = new Date();

    approachingTasks.forEach(task => {
      const recipient = task.assigneeEmail || task.ownerEmail || currentUser.email;
      
      const due = new Date(`${task.dueDate}T23:59:59`);
      const diffMs = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const isOverdue = diffDays <= 0;
      const subject = isOverdue 
        ? `⚠️ [OVERDUE ALERT] Task deadline has passed: "${task.title}"`
        : `⏰ [URGENT] Task deadline approaching: "${task.title}"`;

      const htmlBody = generateEmailHtml(task, diffDays);

      newLogs.push({
        id: Math.random().toString(36).substring(2, 9),
        taskId: task.id,
        taskTitle: task.title,
        recipient,
        subject,
        sentAt: now.toLocaleTimeString() + ' ' + now.toLocaleDateString(),
        status: 'delivered',
        htmlBody
      });
    });

    setEmailLogs(prev => [...newLogs, ...prev]);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(productionFunctionCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const productionFunctionCode = `import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

// SMTP Mail Transporter (e.g. Gmail, SendGrid, Mailgun)
const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || "your-system-email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "your-gmail-app-password",
  },
});

/**
 * Scheduled Cloud Function running daily at 9:00 AM UTC
 * Checks for tasks with deadlines in the next 48 hours and emails assignees
 */
export const checkApproachingDeadlines = onSchedule("0 9 * * *", async (event) => {
  logger.info("Scanning Firestore for upcoming tasks...");
  
  const now = new Date();
  const futureThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 Hours ahead
  
  try {
    const tasksSnapshot = await db.collection("tasks")
      .where("status", "!=", "done")
      .get();
      
    logger.info(\`Found \${tasksSnapshot.size} active tasks. Checking deadlines...\`);
    
    const emailPromises: Promise<any>[] = [];

    tasksSnapshot.forEach((doc) => {
      const task = doc.data();
      if (!task.dueDate) return;

      const dueDate = new Date(\`\${task.dueDate}T23:59:59\`);
      const timeDiff = dueDate.getTime() - now.getTime();
      
      // Filter: Due in next 48h, or overdue
      if (timeDiff <= 48 * 60 * 60 * 1000) {
        const recipient = task.assigneeEmail || task.ownerEmail;
        if (!recipient) return;

        const isOverdue = timeDiff < 0;
        const subject = isOverdue
          ? \`⚠️ [OVERDUE ALERT] Task deadline has passed: "\${task.title}"\`
          : \`⏰ [URGENT] Task deadline approaching: "\${task.title}"\`;

        const htmlContent = \`
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4f46e5;">⏰ Deadline approaching for your task!</h2>
            <p><strong>Task:</strong> \${task.title}</p>
            <p><strong>Description:</strong> \${task.description || "No description provided."}</p>
            <p><strong>Due Date:</strong> \${task.dueDate} \${isOverdue ? "(OVERDUE!)" : ""}</p>
            <p><strong>Priority:</strong> <span style="text-transform: uppercase;">\${task.priority}</span></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Automated alert from Task Board, powered by Firebase Cloud Functions.</p>
          </div>
        \`;

        const mailOptions = {
          from: \`"Task Board Alerts" <\${process.env.SMTP_EMAIL}>\`,
          to: recipient,
          subject: subject,
          html: htmlContent,
        };

        const emailPromise = mailTransport.sendMail(mailOptions)
          .then(() => {
            logger.info(\`Successfully sent deadline alert email to \${recipient} for task \${doc.id}\`);
          })
          .catch((error) => {
            logger.error(\`Failed sending email to \${recipient}:\`, error);
          });

        emailPromises.push(emailPromise);
      }
    });

    await Promise.all(emailPromises);
    logger.info("All deadline checks and alerts completed.");
  } catch (error) {
    logger.error("Error executing deadline check function:", error);
  }
});`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[85vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-300 z-10 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <BellRing className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Firebase Functions Automation Center</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono tracking-wider uppercase px-2.5 py-1 rounded-full font-bold">
                    System Node V2
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Automated background mail alert engine triggering instant updates on task deadlines.
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setActiveTab('simulator');
                  setSelectedEmail(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>Cloud Function Simulator</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('code');
                  setSelectedEmail(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Production Code & Deployment</span>
              </button>
            </div>
          </div>

          {/* Modal Body / Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-white dark:bg-slate-900">
            {activeTab === 'simulator' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                {/* Left Column: Alerts Panel & Config */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Status Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Settings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isSimulationEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isSimulationEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100 mb-1">Simulate Background Cron</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      When enabled, the client acts as the Firebase Scheduler, checking tasks whenever updates are made.
                    </p>

                    <button
                      onClick={() => setIsSimulationEnabled(!isSimulationEnabled)}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        isSimulationEnabled
                          ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10'
                      }`}
                    >
                      {isSimulationEnabled ? 'Disable Simulation' : 'Enable Simulation'}
                    </button>
                  </div>

                  {/* Manual Trigger */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/10 dark:to-violet-950/15 border border-indigo-100 dark:border-indigo-900/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3">
                        <Sparkles className="h-4.5 w-4.5 animate-bounce" />
                        <span className="text-xs font-bold uppercase tracking-widest">Live Trigger</span>
                      </div>
                      <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 mb-1">
                        Run Cloud Function Now
                      </h3>
                      <p className="text-xs text-indigo-950/70 dark:text-slate-400 leading-relaxed mb-4">
                        Manually execute the scheduler. This will analyze all active Firestore tasks, find those due in the next 48 hours or overdue, and send simulated email alerts.
                      </p>
                    </div>

                    <div className="bg-white/50 dark:bg-slate-900/40 p-3 rounded-xl border border-indigo-100/40 dark:border-indigo-950/40 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Tasks:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-1.5">
                        <span className="text-slate-500 dark:text-slate-400">Approaching Deadlines:</span>
                        <span className="font-mono font-bold text-rose-500 dark:text-rose-400">{approachingTasks.length}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerSimulation}
                      disabled={approachingTasks.length === 0}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        approachingTasks.length > 0
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-4 w-4" />
                      <span>Trigger Scheduled Job Now</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Sent Logs & Live Viewer */}
                <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">Simulated Email Delivery Logs</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">History of automated alerts triggered by the simulator</p>
                    </div>
                    {emailLogs.length > 0 && (
                      <button
                        onClick={clearLogs}
                        className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold cursor-pointer"
                      >
                        Clear Logs
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
                    {emailLogs.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                        <Mail className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2.5 animate-pulse" />
                        <span className="text-xs font-semibold">No emails delivered yet</span>
                        <p className="text-[10px] text-slate-500 max-w-[240px] mt-1">
                          Click "Trigger Scheduled Job" or wait for a task deadline to approach to see delivered mail logs.
                        </p>
                      </div>
                    ) : (
                      emailLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-3.5 rounded-xl border transition-all duration-300 ${
                            selectedEmail?.id === log.id
                              ? 'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block mb-0.5">{log.sentAt}</span>
                              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 truncate">{log.subject}</h4>
                              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate mt-1">
                                To: <span className="font-mono">{log.recipient}</span>
                              </p>
                            </div>

                            <button
                              onClick={() => setSelectedEmail(log)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col gap-5">
                <div className="flex flex-col md:flex-row gap-5 items-stretch">
                  <div className="flex-1 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3.5 items-start">
                    <Info className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Deploy to Google Cloud Platform</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        To run this scheduler automatically in production, you can deploy the typescript cloud function below to your Firebase Project. It queries Firestore daily and sends out actual emails using standard mail transports.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3.5 items-start max-w-sm shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Setup SMTP Secrets</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        Remember to configure your <code className="font-mono bg-amber-500/10 px-1 rounded text-[11px]">SMTP_EMAIL</code> and <code className="font-mono bg-amber-500/10 px-1 rounded text-[11px]">SMTP_PASSWORD</code> in your GCP Cloud Function settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative">
                  {/* Code Editor Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">functions/src/index.ts</span>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? 'Copied Code!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  {/* Code Content Container */}
                  <pre className="flex-1 overflow-auto p-5 bg-slate-950 text-indigo-200 dark:text-indigo-100 font-mono text-[11px] leading-relaxed selection:bg-indigo-500/30">
                    {productionFunctionCode}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* HTML Email Overlay Viewer */}
          <AnimatePresence>
            {selectedEmail && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end"
              >
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="bg-white dark:bg-slate-900 w-full max-w-xl h-full flex flex-col shadow-2xl relative border-l border-slate-200 dark:border-slate-800"
                >
                  {/* Close button inside panel */}
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="absolute top-5 left-5 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-300 rounded-full transition-all cursor-pointer z-10 shadow-sm"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>

                  <div className="p-5 pl-16 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-0.5">Mock HTML Inbox</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Email Preview Container</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Showing exact template sent by the function trigger</p>
                  </div>

                  {/* HTML Email Safe View */}
                  <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col">
                    <SafeHtmlRenderer html={selectedEmail.htmlBody} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
