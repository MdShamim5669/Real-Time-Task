// Next.js Root Layout Placeholder
import React from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-950">
        {children}
      </body>
    </html>
  );
}
