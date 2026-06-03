export function cloneVenue(venue) {
  return Object.assign({}, venue, {
    coords: Object.assign({}, venue.coords),
    scenes: (venue.scenes || []).slice(),
    sources: (venue.sources || []).slice(),
  });
}

export function createInitialAppState({ bars, activePage, area }) {
  const venues = bars.map(cloneVenue);
  return {
    backend: {
      venues,
      fallbackVenues: venues.map(cloneVenue),
      reportsByVenue: {},
      supabaseReady: false,
      ownerData: null,
    },
    auth: {
      accessToken: null,
    },
    ui: {
      activePage,
      area,
      profileView: "home",
      detailTab: "live",
      intelMode: "tonight",
      pulseVibe: "chill",
      currentVenue: null,
      selectedReportLevel: null,
      adminVenueId: null,
      toastTimer: null,
      locationBusy: false,
      liveLocationSending: false,
      mapPan: { x: 0, y: 0, drag: false, sx: 0, sy: 0, ox: 0, oy: 0 },
    },
    location: {
      lastPosition: null,
      lastPresenceAt: 0,
      liveLocationWatchId: null,
      liveLocationLastSent: 0,
    },
    map: {
      mapboxReady: null,
      mapboxgl: null,
      mapInstance: null,
      ownerMap: null,
      markers: [],
    },
  };
}

export function getState(state) {
  return state;
}

export function setState(state, partial) {
  Object.keys(partial || {}).forEach((key) => {
    state[key] = Object.assign({}, state[key] || {}, partial[key]);
  });
  return state;
}

export function updateState(state, updater) {
  const next = updater(state);
  return next ? setState(state, next) : state;
}
