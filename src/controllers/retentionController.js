export function createRetentionController(deps = {}) {
  const getRecentVenues = deps.getRecentVenues || function(){ return []; };
  const saveRecentVenue = deps.saveRecentVenue || function(){ return []; };

  function hydrateRecentVenues(venues) {
    return hydrateVenues(getRecentVenues(), venues);
  }

  return {
    saveRecentVenue(id) {
      if (!id) return [];
      return saveRecentVenue(id);
    },
    hydrateRecentVenues,
  };
}

export function hydrateVenues(recentEntries, venues) {
  const active = Array.isArray(venues) ? venues : [];
  const byId = new Map(active.filter((venue) => venue && venue.id).map((venue) => [venue.id, venue]));
  return (Array.isArray(recentEntries) ? recentEntries : [])
    .map((entry) => byId.get(entry && entry.venueId))
    .filter(Boolean);
}
