export const CONFIG = {
  PORT: 3001,
  ADMIN_CODE: 'pickle2024',
  TIMEZONE: 'Asia/Jerusalem',
  VOTING_DEADLINE_DAY: 6, // Saturday
  VOTING_DEADLINE_HOUR: 20, // 20:00
  COSTS: {
    DOUBLES_TOTAL: 130, // 4-5 players
    SINGLES_TOTAL: 100, // 2-3 players
  },
  COURTS: {
    MIN_DOUBLES: 4,
    MAX_PER_COURT: 5,
    TWO_COURTS_MIN: 6,
    TWO_COURTS_MAX: 10,
    SINGLES_MIN: 2,
    SINGLES_MAX: 3,
  },
  DEFAULT_TIME: '20:00',
} as const;
