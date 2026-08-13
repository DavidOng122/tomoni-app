export const formatEventDateTime = (startAt: string, endAt: string | null) => {
  const extractParts = (dateStr: string) => {
    const d = new Date(dateStr);
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);
    
    let month = '', day = '', weekday = '', hour = '', minute = '';
    for (const part of parts) {
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
    }
    
    return { month, day, weekday, hour: hour === '24' ? '0' : hour, minute };
  };

  const start = extractParts(startAt);
  let timeStr = `${start.hour}:${start.minute}`;
  
  if (endAt) {
    const end = extractParts(endAt);
    timeStr += `〜${end.hour}:${end.minute}`;
  }
  
  return `${start.month}月${start.day}日（${start.weekday}）${timeStr}`;
};
