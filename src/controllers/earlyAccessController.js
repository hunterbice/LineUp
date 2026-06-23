export function createEarlyAccessController(deps) {
  let state = { joined: false, joined_at: null, campus_slug: "university_of_arizona", requested_venue_ids: [] };

  function apply(data) {
    if (data && data.early_access) {
      state = Object.assign({}, state, data.early_access, {
        requested_venue_ids: Array.isArray(data.early_access.requested_venue_ids) ? data.early_access.requested_venue_ids : [],
      });
      if (deps.onState) deps.onState(state);
    }
    return state;
  }

  function run(action, extra) {
    if (!deps.isSignedIn()) return Promise.reject(new Error("LineUp account required"));
    return deps.request(action, extra).then(apply);
  }

  return {
    state() { return state; },
    load() { return run("status").catch(function(error) { if (deps.logError) deps.logError("early_access_status_failed", error); return state; }); },
    join() { return run("join", { campus_slug: "university_of_arizona" }); },
    requestDeal(venueId) {
      if (!venueId) return Promise.reject(new Error("Choose a venue first"));
      return run("request_deal", { venue_id: venueId });
    },
    hasRequested(venueId) { return state.requested_venue_ids.indexOf(venueId) >= 0; },
    reset() { state = { joined: false, joined_at: null, campus_slug: "university_of_arizona", requested_venue_ids: [] }; if (deps.onState) deps.onState(state); },
  };
}
