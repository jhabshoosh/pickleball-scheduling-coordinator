import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { PlayerNameDialog } from '@/components/player/PlayerNameDialog';
import { usePlayer } from '@/hooks/usePlayer';
import { HomePage } from '@/pages/HomePage';
import { ResultsPage } from '@/pages/ResultsPage';
import { AdminPage } from '@/pages/AdminPage';
import { ArchivePage } from '@/pages/ArchivePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppContent() {
  const { player, login, logout, switchPlayer, loading } = usePlayer();
  const [showSwitch, setShowSwitch] = useState(false);

  if (!player || showSwitch) {
    return (
      <PlayerNameDialog
        onSubmit={async (name) => {
          await (showSwitch ? switchPlayer(name) : login(name));
          setShowSwitch(false);
        }}
        loading={loading}
      />
    );
  }

  return (
    <Layout
      playerName={player.name}
      onLogout={logout}
      onSwitchPlayer={() => setShowSwitch(true)}
    >
      <Routes>
        <Route path="/" element={<HomePage player={player} />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
