export const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const daysLeft = (d) => {
  const now = new Date();
  const due = new Date(d);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
};

export const toICSDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
};

export const downloadICS = (item) => {
  const end = new Date(item.dueAt);
  const start = new Date(end.getTime() - 30 * 60 * 1000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartLibrary//Due Reminder//EN',
    'BEGIN:VEVENT',
    `UID:sl-${item.checkoutId}@smartlibrary`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${toICSDate(start.toISOString())}`,
    `DTEND:${toICSDate(end.toISOString())}`,
    `SUMMARY:Return book: ${item.title}`.replace(/\n/g, ' '),
    `DESCRIPTION:Please return "${item.title}" to SmartLibrary.`.replace(/\n/g, ' '),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `return-${item.checkoutId}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

export const googleCalUrl = (item) => {
  const end = new Date(item.dueAt);
  const start = new Date(end.getTime() - 30 * 60 * 1000);
  const dates = `${toICSDate(start.toISOString())}/${toICSDate(end.toISOString())}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Return book: ${item.title}`,
    dates,
    details: `Please return "${item.title}" to SmartLibrary.`,
    sf: 'true',
    output: 'xml',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};
