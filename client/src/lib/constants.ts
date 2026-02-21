import { DayOfWeek } from 'shared/types';

export const HEBREW_DAYS: Record<DayOfWeek, string> = {
  0: 'ראשון',
  1: 'שני',
  2: 'שלישי',
  3: 'רביעי',
  4: 'חמישי',
  5: 'שישי',
  6: 'שבת',
};

export const PLAYABLE_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5];
