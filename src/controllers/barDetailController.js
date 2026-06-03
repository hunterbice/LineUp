export function createBarDetailController(deps) {
  return {
    open(id) {
      const venue = deps.findVenue(id);
      if (!venue) {
        if (deps.showToast) deps.showToast("Venue unavailable");
        return;
      }
      deps.setCurrentVenue(venue, "live");
      deps.trackAppEvent(id, "detail_view", { area: venue.area, page: deps.activePage() });
      const reportLoad = deps.loadVenueReports(id);
      if (reportLoad && reportLoad.catch) reportLoad.catch(function(){});
      deps.renderDetail();
      deps.openDetailSheet();
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
