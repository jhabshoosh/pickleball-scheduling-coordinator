// Day of week: 0=Sunday ... 6=Saturday
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Player {
  id: number;
  name: string;
  created_at: string;
}

export type PollStatus = 'open' | 'closed' | 'scheduled' | 'published' | 'archived';

export interface Poll {
  id: number;
  week_start: string; // ISO date string (Sunday)
  week_end: string;   // ISO date string (Saturday)
  voting_deadline: string; // ISO datetime
  status: PollStatus;
  created_by: string;
  extended_deadline: string | null;
  scheduled_days: DayOfWeek[];
}

export type DayStatus = 'open' | 'closed' | 'scheduled';

export interface DayDeadlineInfo {
  day: DayOfWeek;
  deadline: string; // ISO datetime
  status: DayStatus;
}

export interface DayPreference {
  day: DayOfWeek;
  rank: number; // 1 = most preferred
}

export type ConstraintType = 'mutual_exclusion' | 'no_consecutive';

export interface MutualExclusionConstraint {
  type: 'mutual_exclusion';
  days: [DayOfWeek, DayOfWeek];
}

export interface NoConsecutiveConstraint {
  type: 'no_consecutive';
}

export type Constraint = MutualExclusionConstraint | NoConsecutiveConstraint;

export interface Vote {
  id: number;
  poll_id: number;
  player_id: number;
  available_days: DayOfWeek[];
  day_preferences: DayPreference[];
  min_sessions: number;
  max_sessions: number;
  constraints: Constraint[];
  created_at?: string;
  updated_at?: string;
}

export interface VoteWithPlayer extends Vote {
  player_name: string;
}

export type SessionStatus = 'planned' | 'confirmed' | 'cancelled';

export interface Session {
  id: number;
  poll_id: number;
  day_of_week: DayOfWeek;
  session_date: string;
  time: string;
  court_number: number;
  player_ids: number[];
  reserver_id: number | null;
  is_singles: boolean;
  total_cost: number;
  cost_per_person: number;
  status: SessionStatus;
}

export interface SessionWithPlayers extends Session {
  players: Player[];
  reserver: Player | null;
}

export interface ReservationHistory {
  id: number;
  player_id: number;
  session_id: number;
  reserved_at: string;
}

// API request/response types
export interface CreatePlayerRequest {
  name: string;
}

export interface SubmitVoteRequest {
  poll_id: number;
  player_id: number;
  available_days: DayOfWeek[];
  day_preferences: DayPreference[];
  min_sessions: number;
  max_sessions: number;
  constraints: Constraint[];
}

export interface AdminVerifyRequest {
  code: string;
}

export interface CreatePollRequest {
  week_start: string;
}

export interface ExtendDeadlineRequest {
  new_deadline: string;
}

export interface ScheduleResult {
  poll: Poll;
  sessions: SessionWithPlayers[];
  unscheduled_players: Player[];
  warnings: string[];
}

export interface WhatsAppMessage {
  text: string;
}

export interface CostBreakdown {
  session_id: number;
  day: DayOfWeek;
  date: string;
  player_count: number;
  is_singles: boolean;
  total_cost: number;
  cost_per_person: number;
}

// Hebrew day names
export const HEBREW_DAYS: Record<DayOfWeek, string> = {
  0: 'ראשון',
  1: 'שני',
  2: 'שלישי',
  3: 'רביעי',
  4: 'חמישי',
  5: 'שישי',
  6: 'שבת',
};
