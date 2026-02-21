import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  playerName?: string;
  onLogout?: () => void;
  onSwitchPlayer?: () => void;
}

export function Layout({ children, playerName, onLogout, onSwitchPlayer }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header playerName={playerName} onLogout={onLogout} onSwitchPlayer={onSwitchPlayer} />
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
