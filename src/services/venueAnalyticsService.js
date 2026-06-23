const ALLOWED_EVENTS = new Set([
  "deal_impression",
  "deal_tap",
  "venue_detail_open",
  "report_open",
  "report_submit",
  "favorite_add",
]);

function sanitizeMetadata(metadata) {
  const safe = {};
  Object.keys(metadata || {}).slice(0, 12).forEach(function(key) {
    const value = metadata[key];
    if (/lat|lng|location|coord|position/i.test(key)) return;
    if (value == null) return;
    if (typeof value === "string") safe[key] = value.slice(0, 120);
    else if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  });
  return safe;
}

function count(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizePerformance(row) {
  if (!row || !row.venue_id || !row.deal_id) return null;
  return {
    venueId: row.venue_id,
    dealId: row.deal_id,
    dealTitle: String(row.deal_title || "Venue deal").trim(),
    dealType: row.deal_type || "deal",
    isActive: row.is_active !== false,
    isPromoted: !!row.is_promoted,
    promotionTier: row.promotion_tier || "standard",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    impressionsToday: count(row.impressions_today),
    tapsToday: count(row.taps_today),
    detailOpensToday: count(row.detail_opens_today),
    reportOpensToday: count(row.report_opens_today),
    reportSubmitsToday: count(row.report_submits_today),
    favoriteAddsToday: count(row.favorite_adds_today),
    impressions7d: count(row.impressions_7d),
    taps7d: count(row.taps_7d),
    detailOpens7d: count(row.detail_opens_7d),
    tapRate7d: count(row.tap_rate_7d),
  };
}

export function createVenueAnalyticsService({ ingestEvent } = {}) {
  const impressionKeys = new Set();

  function trackVenueEvent(client, event) {
    if (!ingestEvent || !event || !event.venueId || !ALLOWED_EVENTS.has(event.eventType)) return Promise.resolve(null);
    const payload = {
      venue_id: event.venueId,
      deal_id: event.dealId || null,
      event_type: event.eventType,
      metadata: sanitizeMetadata(event.metadata || {}),
    };
    return ingestEvent(payload).then(function(res) {
      return res && (res.event || res) || null;
    }).catch(function(error) {
      if (event.logError) event.logError("venue_analytics_failed", error);
      return null;
    });
  }

  function trackDealImpression(client, event) {
    const key = [event && event.dealId, event && event.venueId, event && event.surface].join(":");
    if (impressionKeys.has(key)) return Promise.resolve(null);
    impressionKeys.add(key);
    return trackVenueEvent(client, Object.assign({}, event, { eventType: "deal_impression" }));
  }

  function fetchVenueDealPerformance(client, venueId) {
    if (!client || !venueId) return Promise.resolve([]);
    if (import.meta.env.DEV && Array.isArray(globalThis.window && globalThis.window.LINEUP_TEST_DEAL_PERFORMANCE)) {
      return Promise.resolve(globalThis.window.LINEUP_TEST_DEAL_PERFORMANCE.filter((row) => row && row.venue_id === venueId).map(normalizePerformance).filter(Boolean));
    }
    return client.rpc("venue_deal_performance", { target_venue_id: venueId }).then(function(res) {
      if (res.error) throw res.error;
      return (res.data || []).map(normalizePerformance).filter(Boolean);
    }).catch(function(error) {
      const message = error && /permission|denied|jwt|role|rls/i.test(error.message || "")
        ? "You do not have access to this venue's deal performance."
        : "Performance data is unavailable right now.";
      const wrapped = new Error(message);
      wrapped.cause = error;
      throw wrapped;
    });
  }

  return {
    trackVenueEvent,
    fetchVenueDealPerformance,
    trackDealImpression,
    trackDealTap: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "deal_tap" })),
    trackVenueDetailOpen: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "venue_detail_open" })),
    trackReportOpen: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "report_open" })),
    trackReportSubmit: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "report_submit" })),
    trackFavoriteAdd: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "favorite_add" })),
  };
}

export const venueAnalyticsTestHooks = { sanitizeMetadata, normalizePerformance };
