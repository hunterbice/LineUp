import { esc } from "../utils/dom.js";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function dealTimeWindow(deal) {
  const start = formatTime(deal && deal.startsAt);
  const end = formatTime(deal && deal.endsAt);
  return start && end ? start + " - " + end : end ? "Ends " + end : start ? "Starts " + start : "Tonight";
}

export function dealEndingCue(deal, nowMs = Date.now()) {
  const endsAt = Date.parse(deal && deal.endsAt || "");
  if (!Number.isFinite(endsAt) || endsAt <= nowMs) return "";
  const minutes = Math.ceil((endsAt - nowMs) / 60000);
  if (minutes <= 30) return "Ending soon";
  if (minutes <= 60) return "Ends soon";
  return "";
}

export function renderDealsSkeleton(count = 3) {
  return '<div class="dealGrid skeletonGrid" aria-label="Loading deals">' + Array.from({ length: count }, function() {
    return '<div class="dealCard dealCardSkeleton" aria-hidden="true"><span class="skeletonLine short"></span><span class="skeletonLine title"></span><span class="skeletonLine"></span><span class="skeletonLine medium"></span><span class="skeletonButton"></span></div>';
  }).join("") + '</div>';
}

export function renderDealsPage({ deals, venuesById, loading, error, nowMs = Date.now() }) {
  const list = Array.isArray(deals) ? deals : [];
  const header = '<div class="pageIntro dealsIntro"><span class="sectionEyebrow">DEALS</span><h1>Active deals right now</h1><p>Current specials and events posted by venues.</p></div>';
  if (loading && !list.length) return header + renderDealsSkeleton();
  if (!list.length) {
    const detail = error ? "Deals could not refresh. Try again shortly." : "Check back closer to tonight.";
    return header + '<div class="emptyState dealsEmpty"><b>No active deals right now.</b><p>' + esc(detail) + '</p></div>';
  }
  return header + '<div class="dealGrid">' + list.map(function(deal) {
    const venue = venuesById && venuesById[deal.venueId];
    if (!venue) return "";
    const cue = dealEndingCue(deal, nowMs);
    return '<article class="dealCard" tabindex="0" role="button" aria-label="View ' + esc(deal.title) + ' at ' + esc(venue.name) + '" data-deal-id="' + esc(deal.id) + '" data-deal-venue="' + esc(deal.venueId) + '">' +
      '<div class="dealCardTop"><span>' + esc(venue.name) + '</span>' + (deal.isPromoted ? '<em>Promoted</em>' : '') + '</div>' +
      '<h2>' + esc(deal.title) + '</h2>' +
      (deal.description ? '<p>' + esc(deal.description) + '</p>' : '') +
      '<div class="dealTime"><span>' + esc(dealTimeWindow(deal)) + '</span>' + (cue ? '<b>' + esc(cue) + '</b>' : '') + '</div>' +
      '<span class="dealDetailsAction">Details <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></span>' +
    '</article>';
  }).join("") + '</div>';
}

