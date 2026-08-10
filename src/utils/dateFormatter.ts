export const formatEventDateTime = (startAt: string, endAt: string | null) => {
  const start = new Date(startAt);
  const month = start.getMonth() + 1;
  const date = start.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const day = dayNames[start.getDay()];
  
  const startHours = start.getHours();
  const startMinutes = start.getMinutes().toString().padStart(2, '0');
  let timeStr = `${startHours}:${startMinutes}`;
  
  if (endAt) {
    const end = new Date(endAt);
    const endHours = end.getHours();
    const endMinutes = end.getMinutes().toString().padStart(2, '0');
    timeStr += `〜${endHours}:${endMinutes}`;
  }
  
  return `${month}月${date}日（${day}）${timeStr}`;
};
