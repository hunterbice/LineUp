export function createBarDetailController(deps) {
  return {
    open(id, meta) {
      const venue = deps.findVenue(id);
      if (!venue) {
        if (deps.showToast) deps.showToast("Venue unavailable");
        return;
      }
      const initialTab = meta && (meta.initialTab || (meta.focusDeal ? "deals" : "live"));
      deps.setCurrentVenue(venue, initialTab || "live");
      if (deps.saveRecentVenue) deps.saveRecentVenue(id);
      deps.trackAppEvent(id, "detail_view", Object.assign({ area: venue.area, page: deps.activePage() }, meta || {}));
      if (deps.trackVenueDetailOpen) deps.trackVenueDetailOpen(id, meta || {});
      const reportLoad = deps.loadVenueReports(id);
      if (reportLoad && reportLoad.catch) reportLoad.catch(function(){});
      deps.renderDetail();
      deps.openDetailSheet();
      if (meta && meta.focusDeal && deps.focusDealSection) deps.focusDealSection();
    },
    close() {
      deps.closeDetailSheet();
    },
    selectTab(tab) {
      if (!tab) return;
      deps.setDetailTab(tab);
      deps.renderDetail();
    },
    navigate(toId, direction) {
      if (!toId) return;
      deps.animateNavigate(toId, direction);
    },
  };
}
