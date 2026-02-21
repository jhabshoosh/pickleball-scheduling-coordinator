const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

function getAdminHeaders(): HeadersInit {
  const code = localStorage.getItem('adminCode');
  return code ? { 'x-admin-code': code } : {};
}

// Players
export const api = {
  // Players
  createPlayer: (name: string) =>
    request<any>('/players', { method: 'POST', body: JSON.stringify({ name }) }),
  getPlayers: () =>
    request<any[]>('/players'),

  // Polls
  getCurrentPoll: () =>
    request<any>('/polls/current'),
  getPollVotes: (pollId: number) =>
    request<any[]>(`/polls/${pollId}/votes`),
  getPollResults: (pollId: number) =>
    request<any>(`/polls/${pollId}/results`),

  // Votes
  submitVote: (data: any) =>
    request<any>('/votes', { method: 'POST', body: JSON.stringify(data) }),
  getVote: (pollId: number, playerId: number) =>
    request<any>(`/votes/${pollId}/${playerId}`),
  deleteVote: (pollId: number, playerId: number) =>
    request<any>(`/votes/${pollId}/${playerId}`, { method: 'DELETE' }),

  // Schedule
  generateSchedule: (pollId: number) =>
    request<any>(`/schedule/${pollId}/generate`, {
      method: 'POST',
      headers: getAdminHeaders(),
    }),
  getWhatsApp: (pollId: number) =>
    request<any>(`/schedule/${pollId}/whatsapp`),

  // Admin
  verifyAdmin: (code: string) =>
    request<any>('/admin/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  createPoll: (weekStart: string) =>
    request<any>('/admin/polls/create', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ week_start: weekStart }),
    }),
  getAdminPolls: () =>
    request<any[]>('/admin/polls', { headers: getAdminHeaders() }),
  extendDeadline: (pollId: number, newDeadline: string) =>
    request<any>(`/admin/polls/${pollId}/extend`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ new_deadline: newDeadline }),
    }),
  publishPoll: (pollId: number) =>
    request<any>(`/admin/polls/${pollId}/publish`, {
      method: 'PUT',
      headers: getAdminHeaders(),
    }),
  closePoll: (pollId: number) =>
    request<any>(`/admin/polls/${pollId}/close`, {
      method: 'PUT',
      headers: getAdminHeaders(),
    }),
  archivePoll: (pollId: number) =>
    request<any>(`/admin/polls/${pollId}/archive`, {
      method: 'PUT',
      headers: getAdminHeaders(),
    }),

  // Archive
  getArchive: () =>
    request<any[]>('/archive'),
  getArchiveDetail: (pollId: number) =>
    request<any>(`/archive/${pollId}`),
};
