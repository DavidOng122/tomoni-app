import { DayOfWeek } from '../types';
import { DAY_LABELS, DAY_ORDER } from './constants';

export const formatWeekdays = (days: DayOfWeek[]): string => {
  const sortedDays = [...days].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  return sortedDays.map(d => DAY_LABELS[d]).join('・');
};

export const formatTo12Hour = (timeStr: string) => {
  if (!timeStr) return { time: '', isPm: false };
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const isPm = hour >= 12;
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return { time: `${hour}:${m || '00'}`, isPm };
};

export const formatTo24Hour = (time: string, isPm: boolean) => {
  if (!time) return '';
  let [h, m] = time.split(':');
  if (!h || !m) return '';
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return '';
  
  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}`;
};
