import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  playerName?: string;
  onLogout?: () => void;
  onSwitchPlayer?: () => void;
}

export function Header({ playerName, onLogout, onSwitchPlayer }: HeaderProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'הצבעה' },
    { path: '/results', label: 'תוצאות' },
    { path: '/admin', label: 'ניהול' },
    { path: '/archive', label: 'ארכיון' },
  ];

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-primary">
            🏓 פיקלבול
          </h1>
          {playerName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{playerName}</span>
              <button
                onClick={onSwitchPlayer}
                className="text-xs text-primary hover:underline"
              >
                החלף
              </button>
            </div>
          )}
        </div>
        <nav className="flex gap-1 -mb-px">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                location.pathname === item.path
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
