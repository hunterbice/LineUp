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

export function createVenueAnalyticsService() {
  const impressionKeys = new Set();

  function trackVenueEvent(client, event) {
    if (!client || !event || !event.venueId || !ALLOWED_EVENTS.has(event.eventType)) return Promise.resolve(null);
    const row = {
      venue_id: event.venueId,
      deal_id: event.dealId || null,
      event_type: event.eventType,
      user_id: event.userId || null,
      device_id: event.deviceId || null,
      metadata: sanitizeMetadata(event.metadata || {}),
    };
    return client.from("venue_analytics_events").insert(row).then(function(res) {
      if (res.error) throw res.error;
      return res.data || null;
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

  return {
    trackVenueEvent,
    trackDealImpression,
    trackDealTap: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "deal_tap" })),
    trackVenueDetailOpen: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "venue_detail_open" })),
    trackReportOpen: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "report_open" })),
    trackReportSubmit: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "report_submit" })),
    trackFavoriteAdd: (client, event) => trackVenueEvent(client, Object.assign({}, event, { eventType: "favorite_add" })),
  };
}

export const venueAnalyticsTestHooks = { sanitizeMetadata };
