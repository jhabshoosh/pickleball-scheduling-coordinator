import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminPanel } from '@/components/admin/AdminPanel';

export function AdminPage() {
  const { isAdmin, login, logout } = useAdmin();

  if (!isAdmin) {
    return <AdminLogin onLogin={login} />;
  }

  return <AdminPanel onLogout={logout} />;
}
