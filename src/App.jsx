import React, { useState } from 'react';
import FocusTimer from './components/FocusTimer.jsx';
import TodoList from './components/TodoList.jsx';
import Notes from './components/Notes.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { AuthProvider } from './lib/AuthProvider.jsx';
import { load } from './lib/storage.js';

function fmtDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function App() {
  const todos = load('todos', []);
  const stats = load('stats:focus', {});
  const todayKey = dateKey();
  const todayStats = stats[todayKey] || { seconds: 0, sessions: 0 };
  const completed = todos.filter(t => t.done).length;
  const active = todos.length - completed;

  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="header-bar">
          <div className="brand-title">
            <span className="brand-logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="var(--primary)"/>
                    <stop offset="1" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
                <path d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3z" fill="url(#g)" opacity="0.2"/>
                <path d="M6 12c2.5-2.2 5.5-2.2 8 0 2.5 2.2 5.5 2.2 8 0" stroke="url(#g)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            {' '}FocusFlow
          </div>
          <div className="toolbar">
            <ThemeToggle />
          </div>
        </header>

        <main className="main-content">
          {/* Hero Section */}
          <section className="hero-section">
            <h1 className="main-title">Your calm space to get things done</h1>
            <p className="main-subtitle">Deep focus timer, tasks, and notes in one place.</p>
            
            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-item">
                <span className="stat-value">{fmtDuration(todayStats.seconds)}</span>
                <span className="stat-label">Focus time today</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{todayStats.sessions}</span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{active}</span>
                <span className="stat-label">Active tasks</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{completed}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
          </section>

          {/* Main Grid */}
          <div className="main-grid">
            <div className="focus-section">
              <FocusTimer />
            </div>
            
            <div className="tasks-section">
              <TodoList />
            </div>
            
            <div className="notes-section">
              <Notes />
            </div>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
