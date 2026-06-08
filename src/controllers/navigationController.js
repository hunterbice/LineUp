export function selectPage(state, requestedPage, canUseVenueControls) {
  const nextPage = requestedPage === "statsPage" && !canUseVenueControls() ? "livePage" : requestedPage;
  state.ui.activePage = nextPage;
  return nextPage;
}

export function selectArea(state, nextArea, cacheState) {
  state.ui.area = nextArea;
  cacheState.setArea(nextArea);
  return nextArea;
}

export function selectProfileView(state, view) {
  state.ui.profileView = view || "home";
  state.ui.activePage = "profilePage";
  return state.ui.profileView;
}

export function selectDetailVenue(state, venue, tab) {
  state.ui.currentVenue = venue || null;
  state.ui.detailTab = tab || "live";
  return state.ui.currentVenue;
}

export function selectDetailTab(state, tab) {
  state.ui.detailTab = tab;
  return tab;
}

export function selectReportLevel(state, level) {
  state.ui.selectedReportLevel = level;
  return level;
}

export function selectAdminVenue(state, venueId) {
  state.ui.adminVenueId = venueId || null;
  return state.ui.adminVenueId;
}
