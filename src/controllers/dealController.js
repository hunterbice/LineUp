export function groupDealsByVenue(deals) {
  return (Array.isArray(deals) ? deals : []).reduce(function(map, deal) {
    if (!deal || !deal.venueId) return map;
    if (!map[deal.venueId]) map[deal.venueId] = [];
    map[deal.venueId].push(deal);
    return map;
  }, {});
}

export function selectDashboardDeals({ deals, venues, favorites, recents }) {
  const venueIds = new Set((Array.isArray(venues) ? venues : []).map((venue) => venue.id));
  const favoriteIds = new Set((Array.isArray(favorites) ? favorites : []).map((venue) => venue.id));
  const recentIds = new Set((Array.isArray(recents) ? recents : []).map((venue) => venue.id));
  const seen = new Set();
  const active = (Array.isArray(deals) ? deals : []).filter((deal) => venueIds.has(deal.venueId));
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
  function setDeals(deals) {
    deps.setDealState({
      activeDeals: deals,
      dealsByVenue: groupDealsByVenue(deals),
      dealLoading: false,
      dealError: "",
    });
    return deals;
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
    deps.showToast("Deactivating deal...");
    return deps.dealService.deactivateVenueDeal(client(), dealId).then(function() {
      return loadActiveDeals(false);
    }).then(function() {
      deps.renderAll();
      deps.showToast("Deal deactivated");
    }).catch(function(error) {
      if (deps.logError) deps.logError("deal_deactivate_failed", error);
      deps.showToast(error && error.message ? error.message : "Deal could not deactivate");
    });
  }

  return {
    loadActiveDeals,
    dealsForVenue,
    primaryDealForVenue,
    dashboardDeals,
    handleDealTap,
    saveFromForm,
    deactivate,
  };
}
