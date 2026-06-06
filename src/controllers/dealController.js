export function groupDealsByVenue(deals) {
  return (Array.isArray(deals) ? deals : []).reduce(function(map, deal) {
    if (!deal || !deal.venueId) return map;
    if (!map[deal.venueId]) map[deal.venueId] = [];
    map[deal.venueId].push(deal);
    return map;
  }, {});
}

export function isDealCurrent(deal, nowMs = Date.now()) {
  if (!deal || !deal.id || !deal.venueId || deal.isActive === false) return false;
  const startsAt = Date.parse(deal.startsAt || "");
  const endsAt = Date.parse(deal.endsAt || "");
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return false;
  return startsAt <= nowMs && endsAt > nowMs;
}

export function selectDashboardDeals({ deals, venues, favorites, recents }) {
  const venueIds = new Set((Array.isArray(venues) ? venues : []).map((venue) => venue.id));
  const favoriteIds = new Set((Array.isArray(favorites) ? favorites : []).map((venue) => venue.id));
  const recentIds = new Set((Array.isArray(recents) ? recents : []).map((venue) => venue.id));
  const seen = new Set();
  const active = (Array.isArray(deals) ? deals : []).filter((deal) => isDealCurrent(deal) && venueIds.has(deal.venueId));
  function take(predicate) {
    return active.filter(function(deal) {
      if (seen.has(deal.id) || !predicate(deal)) return false;
      seen.add(deal.id);
      return true;
    });
  }
  return []
    .concat(take((deal) => deal.isPromoted))
    .concat(take((deal) => favoriteIds.has(deal.venueId)))
    .concat(take((deal) => recentIds.has(deal.venueId)))
    .concat(take(() => true));
}

export function createDealController(deps) {
  function client() { return deps.supabaseClient && deps.supabaseClient(); }
  function performanceState() { return deps.dealPerformanceByVenue ? deps.dealPerformanceByVenue() : {}; }
  function setDeals(deals) {
    const currentDeals = (Array.isArray(deals) ? deals : []).filter((deal) => isDealCurrent(deal));
    deps.setDealState({
      activeDeals: currentDeals,
      dealsByVenue: groupDealsByVenue(currentDeals),
      dealLoading: false,
      dealError: "",
    });
    return currentDeals;
  }

  function setPerformance(venueId, patch) {
    if (!venueId || !deps.setDealState) return null;
    const next = Object.assign({}, performanceState());
    next[venueId] = Object.assign({ rows: [], loading: false, error: "", loadedAt: 0 }, next[venueId] || {}, patch || {});
    deps.setDealState({ dealPerformanceByVenue: next });
    return next[venueId];
  }

  function loadActiveDeals(renderAfter) {
    if (!client()) return Promise.resolve([]);
    deps.setDealState({ dealLoading: true, dealError: "" });
    return deps.dealService.fetchActiveDeals(client()).then(function(deals) {
      setDeals(deals);
      if (renderAfter) deps.renderAll();
      deals.slice(0, 12).forEach(function(deal) {
        deps.analytics.trackDealImpression(client(), deps.analyticsPayload(deal.venueId, deal.id, { surface: "dashboard" }));
      });
      return deals;
    }).catch(function(error) {
      deps.setDealState({ activeDeals: [], dealsByVenue: {}, dealLoading: false, dealError: "Deals unavailable" });
      if (deps.logError) deps.logError("active_deals_failed", error);
      if (renderAfter) deps.renderAll();
      return [];
    });
  }

  function loadDealPerformance(venueId, renderAfter) {
    if (!venueId) return Promise.resolve([]);
    if (!client() || !deps.analytics || !deps.analytics.fetchVenueDealPerformance) {
      setPerformance(venueId, { rows: [], loading: false, error: "Performance data is unavailable right now." });
      if (renderAfter) deps.renderAll();
      return Promise.resolve([]);
    }
    setPerformance(venueId, { loading: true, error: "" });
    if (renderAfter) deps.renderAll();
    return deps.analytics.fetchVenueDealPerformance(client(), venueId).then(function(rows) {
      setPerformance(venueId, { rows: rows, loading: false, error: "", loadedAt: Date.now() });
      if (renderAfter) deps.renderAll();
      return rows;
    }).catch(function(error) {
      setPerformance(venueId, { rows: [], loading: false, error: error && error.message ? error.message : "Performance data is unavailable right now.", loadedAt: Date.now() });
      if (deps.logError) deps.logError("deal_performance_failed", error && error.cause || error);
      if (renderAfter) deps.renderAll();
      return [];
    });
  }

  function maybeLoadDealPerformance(venueId, renderAfter) {
    const current = venueId && performanceState()[venueId];
    if (!venueId || current && (current.loading || Date.now() - (current.loadedAt || 0) < 60000)) return Promise.resolve(current && current.rows || []);
    return loadDealPerformance(venueId, renderAfter);
  }

  function dealsForVenue(venueId) {
    return deps.dealsByVenue()[venueId] || [];
  }

  function primaryDealForVenue(venueId) {
    return dealsForVenue(venueId)[0] || null;
  }

  function dashboardDeals(context) {
    return selectDashboardDeals(Object.assign({}, context, { deals: deps.activeDeals() })).slice(0, 6);
  }

  function handleDealTap(deal) {
    if (!deal || !deal.venueId) return deps.showToast("Deal unavailable");
    deps.analytics.trackDealTap(client(), deps.analyticsPayload(deal.venueId, deal.id, { surface: "dashboard" }));
    deps.openDetail(deal.venueId, { source: "deal", dealId: deal.id });
  }

  function saveFromForm(venueId, prefix) {
    if (!client()) return deps.showToast("Deal service unavailable");
    const field = (name) => document.getElementById(prefix + name);
    const existingId = field("Id") && field("Id").value || "";
    const promoted = !!(field("Promoted") && field("Promoted").checked);
    const payload = {
      id: existingId || undefined,
      venueId,
      title: field("Title") && field("Title").value,
      description: field("Description") && field("Description").value,
      dealType: field("Type") && field("Type").value,
      startsAt: field("Starts") && field("Starts").value ? new Date(field("Starts").value).toISOString() : "",
      endsAt: field("Ends") && field("Ends").value ? new Date(field("Ends").value).toISOString() : "",
      isActive: !(field("Active") && !field("Active").checked),
      isPromoted: promoted,
      promotionTier: promoted && field("Tier") ? field("Tier").value : "standard",
    };
    deps.showToast("Saving venue deal...");
    return deps.dealService.upsertVenueDeal(client(), payload).then(function() {
      return loadActiveDeals(false);
    }).then(function() {
      return loadDealPerformance(venueId, false);
    }).then(function() {
      deps.renderAll();
      deps.showToast("Deal saved");
    }).catch(function(error) {
      if (deps.logError) deps.logError("deal_save_failed", error);
      deps.showToast(error && error.message ? error.message : "Deal could not save");
    });
  }

  function deactivate(dealId) {
    if (!client()) return deps.showToast("Deal service unavailable");
    if (!dealId) return deps.showToast("No active deal selected");
    const venueId = venueIdForDeal(dealId);
    deps.showToast("Deactivating deal...");
    return deps.dealService.deactivateVenueDeal(client(), dealId).then(function() {
      return loadActiveDeals(false);
    }).then(function() {
      return venueId ? loadDealPerformance(venueId, false) : Promise.resolve([]);
    }).then(function() {
      deps.renderAll();
      deps.showToast("Deal deactivated");
    }).catch(function(error) {
      if (deps.logError) deps.logError("deal_deactivate_failed", error);
      deps.showToast(error && error.message ? error.message : "Deal could not deactivate");
    });
  }

  function venueIdForDeal(dealId) {
    const all = deps.activeDeals ? deps.activeDeals() : [];
    const found = (Array.isArray(all) ? all : []).find((deal) => deal && deal.id === dealId);
    if (found) return found.venueId;
    const grouped = deps.dealsByVenue ? deps.dealsByVenue() : {};
    return Object.keys(grouped || {}).find((venueId) => (grouped[venueId] || []).some((deal) => deal && deal.id === dealId)) || "";
  }

  return {
    loadActiveDeals,
    loadDealPerformance,
    maybeLoadDealPerformance,
    dealsForVenue,
    primaryDealForVenue,
    dashboardDeals,
    handleDealTap,
    saveFromForm,
    deactivate,
  };
}
