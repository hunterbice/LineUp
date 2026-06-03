export function createVenueService({ activeStatusSelect }) {
  function loadActiveStatus(supabaseClient) {
    return supabaseClient.from("active_venue_status").select(activeStatusSelect);
  }

  function subscribeStatus(supabaseClient, onChange) {
    return supabaseClient.channel("lineup-live-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_status" }, onChange)
      .subscribe();
  }

  function subscribeReports(supabaseClient, onInsert) {
    return supabaseClient.channel("lineup-live-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, onInsert)
      .subscribe();
  }

  return { loadActiveStatus, subscribeStatus, subscribeReports };
}
