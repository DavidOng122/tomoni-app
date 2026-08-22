const extractTokyoDateTimeParts = (dateStr: string) => {
  const d = new Date(dateStr);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  let year = '', month = '', day = '', weekday = '', hour = '', minute = '';
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
  }

  return {
    year,
    month,
    day,
    weekday,
    hour: hour === '24' ? '00' : hour.padStart(2, '0'),
    minute,
  };
};

export const formatEventDateTime = (startAt: string, endAt: string | null) => {

  const start = extractTokyoDateTimeParts(startAt);
  let timeStr = `${start.hour}:${start.minute}`;
  
  if (endAt) {
    const end = extractTokyoDateTimeParts(endAt);
    timeStr += `〜${end.hour}:${end.minute}`;
  }
  
  return `${start.month}月${start.day}日（${start.weekday}）${timeStr}`;
};

export const formatEventTimeRange = (startAt: string, endAt: string | null) => {
  const start = extractTokyoDateTimeParts(startAt);
  const startTime = `${start.hour}:${start.minute}`;

  if (!endAt) return startTime;

  const end = extractTokyoDateTimeParts(endAt);
  const endTime = `${end.hour}:${end.minute}`;
  const sameTokyoDate = start.year === end.year
    && start.month === end.month
    && start.day === end.day;

  return sameTokyoDate
    ? `${startTime}〜${endTime}`
    : `${startTime}〜${end.month}月${end.day}日 ${endTime}`;
};
