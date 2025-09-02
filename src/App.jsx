import React from 'react';
import FocusTimer from './components/FocusTimer.jsx';
import TodoList from './components/TodoList.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { AuthProvider } from './lib/AuthProvider.jsx';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="header-bar">
          <div className="brand-title">🎯 FocusFlow</div>
          <div className="toolbar">
            <ThemeToggle />
          </div>
        </header>

        <main className="main-content">
          <h1 className="main-title">Your calm space to get things done</h1>
          
          <div className="main-grid">
            <div className="focus-section">
              <FocusTimer />
            </div>
            
            <div className="tasks-section">
              <TodoList />
            </div>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
