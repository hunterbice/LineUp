export const NIGHTLIFE_BOUNDARY_HOUR = 5;
const PHOENIX_UTC_OFFSET_HOURS = 7;

// Tucson/Phoenix stays on UTC-7 year-round. A nightlife day begins at 5 AM,
// so reports after midnight remain part of the prior evening.
export function nightlifeWindowStart(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(value.getTime())) return new Date(NaN);
  const phoenixClock = new Date(value.getTime() - PHOENIX_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const year = phoenixClock.getUTCFullYear();
  const month = phoenixClock.getUTCMonth();
  const date = phoenixClock.getUTCDate();
  const beforeBoundary = phoenixClock.getUTCHours() < NIGHTLIFE_BOUNDARY_HOUR;
  return new Date(Date.UTC(
    year,
    month,
    date - (beforeBoundary ? 1 : 0),
    NIGHTLIFE_BOUNDARY_HOUR + PHOENIX_UTC_OFFSET_HOURS,
  ));
}

export function isCurrentNightTimestamp(value, now = new Date()) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  const current = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const start = nightlifeWindowStart(now).getTime();
  return Number.isFinite(timestamp) && Number.isFinite(current) && timestamp >= start && timestamp <= current + 5 * 60 * 1000;
}

export function filterCurrentNightReports(reports, now = new Date()) {
  return (Array.isArray(reports) ? reports : []).filter((report) => report && isCurrentNightTimestamp(report.created_at, now));
}
