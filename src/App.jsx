import React from 'react';
import { AuthProvider } from './lib/AuthProvider.jsx';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <header className="header-bar">
          <div className="brand-title">FocusFlow</div>
        </header>
        <main className="main-content">
          <h1>Test - App is working!</h1>
        </main>
      </div>
    </AuthProvider>
  );
}
