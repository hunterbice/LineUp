const DEAL_TYPES = new Set(["deal", "event", "cover", "happy_hour", "special"]);
const PROMOTION_TIERS = new Set(["standard", "boost", "premier"]);

function clean(value, max) {
  const text = String(value || "").trim();
  return max ? text.slice(0, max) : text;
}

function normalizeDeal(row) {
  if (!row || !row.id || !row.venue_id) return null;
  return {
    id: row.id,
    venueId: row.venue_id,
    title: clean(row.title, 80),
    description: clean(row.description, 240),
    dealType: DEAL_TYPES.has(row.deal_type) ? row.deal_type : "deal",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active !== false,
    isPromoted: !!row.is_promoted,
    promotionTier: PROMOTION_TIERS.has(row.promotion_tier) ? row.promotion_tier : "standard",
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function normalizeSubscription(row, venueId) {
  return {
    venueId: row && row.venue_id || venueId || "",
    plan: row && row.plan || "free",
    status: row && row.status || "active",
    endsAt: row && row.ends_at || null,
  };
}

function normalizePayload(payload) {
  const title = clean(payload && payload.title, 80);
  const description = clean(payload && payload.description, 240);
  const dealType = DEAL_TYPES.has(payload && payload.dealType) ? payload.dealType : "deal";
  const promotionTier = PROMOTION_TIERS.has(payload && payload.promotionTier) ? payload.promotionTier : "standard";
  const isPromoted = !!(payload && payload.isPromoted);
  return {
    id: payload && payload.id || undefined,
    venue_id: clean(payload && payload.venueId),
    title,
    description: description || null,
    deal_type: dealType,
    starts_at: payload && payload.startsAt,
    ends_at: payload && payload.endsAt,
    is_active: payload && payload.isActive !== false,
    is_promoted: isPromoted,
    promotion_tier: isPromoted ? promotionTier : "standard",
  };
}

function activeQuery(client) {
  const now = new Date().toISOString();
  return client
    .from("venue_deals")
    .select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("is_promoted", { ascending: false })
    .order("promotion_tier", { ascending: false })
    .order("ends_at", { ascending: true });
}

export function createVenueDealService() {
  function fetchActiveDeals(client) {
    if (import.meta.env.DEV && Array.isArray(globalThis.window && globalThis.window.LINEUP_TEST_DEALS)) {
      return Promise.resolve(globalThis.window.LINEUP_TEST_DEALS.map(normalizeDeal).filter(Boolean));
    }
    if (!client) return Promise.resolve([]);
    return activeQuery(client).then(function(res) {
      if (res.error) throw res.error;
      return (res.data || []).map(normalizeDeal).filter(Boolean);
    });
  }

  function fetchDealsForVenue(client, venueId) {
    if (!client || !venueId) return Promise.resolve([]);
    const now = new Date().toISOString();
    return client
      .from("venue_deals")
      .select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .lte("starts_at", now)
      .gt("ends_at", now)
      .order("starts_at", { ascending: true })
      .then(function(res) {
        if (res.error) throw res.error;
        return (res.data || []).map(normalizeDeal).filter(Boolean);
      });
  }

  function fetchVenueDealForEdit(client, venueId) {
    if (!client || !venueId) return Promise.resolve(null);
    return client
      .from("venue_deals")
      .select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(function(res) {
        if (res.error) throw res.error;
        return normalizeDeal(res.data);
      });
  }

  function upsertVenueDeal(client, payload) {
    if (!client) return Promise.reject(new Error("Deal service unavailable"));
    const row = normalizePayload(payload || {});
    if (!row.venue_id) return Promise.reject(new Error("Choose a venue first"));
    if (row.title.length < 3) return Promise.reject(new Error("Add a deal title"));
    if (!row.starts_at || !row.ends_at || new Date(row.ends_at) <= new Date(row.starts_at)) {
      return Promise.reject(new Error("Choose a valid deal window"));
    }
    const query = row.id
      ? client.from("venue_deals").update(row).eq("id", row.id).select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at").single()
      : client.from("venue_deals").insert(row).select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at").single();
    return query.then(function(res) {
      if (res.error) throw res.error;
      return normalizeDeal(res.data);
    });
  }

  function deactivateVenueDeal(client, dealId) {
    if (!client || !dealId) return Promise.reject(new Error("Choose a deal first"));
    return client
      .from("venue_deals")
      .update({ is_active: false, is_promoted: false, promotion_tier: "standard" })
      .eq("id", dealId)
      .select("id,venue_id,title,description,deal_type,starts_at,ends_at,is_active,is_promoted,promotion_tier,created_by,created_at,updated_at")
      .single()
      .then(function(res) {
        if (res.error) throw res.error;
        return normalizeDeal(res.data);
      });
  }

  function fetchVenueSubscription(client, venueId) {
    if (!client || !venueId) return Promise.resolve(normalizeSubscription(null, venueId));
    return client
      .from("venue_subscriptions")
      .select("venue_id,plan,status,ends_at")
      .eq("venue_id", venueId)
      .maybeSingle()
      .then(function(res) {
        if (res.error) throw res.error;
        return normalizeSubscription(res.data, venueId);
      });
  }

  return {
    fetchActiveDeals,
    fetchDealsForVenue,
    fetchVenueDealForEdit,
    upsertVenueDeal,
    deactivateVenueDeal,
    fetchVenueSubscription,
  };
}

export const venueDealTestHooks = { normalizeDeal, normalizePayload };
