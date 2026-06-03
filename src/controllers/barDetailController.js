export function createBarDetailController(deps) {
  return {
    open(id) {
      const venue = deps.findVenue(id);
      deps.setCurrentVenue(venue, "live");
      if (venue) {
        deps.trackAppEvent(id, "detail_view", { area: venue.area, page: deps.activePage() });
        deps.loadVenueReports(id);
      }
      deps.renderDetail();
      deps.openDetailSheet();
    },
    close() {
      deps.closeDetailSheet();
    },
    selectTab(tab) {
      deps.setDetailTab(tab);
      deps.renderDetail();
    },
    navigate(toId, direction) {
      deps.animateNavigate(toId, direction);
    },
  };
}
