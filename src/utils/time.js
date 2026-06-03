export function minutesSince(value) {
  const time = value ? new Date(value).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  return Math.min(999, minutes);
}

export function hour(hour24) {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const display = hour24 % 12 || 12;
  return display + " " + suffix;
}

export function timeAgo(value) {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return Math.round(hours / 24) + "d ago";
}
