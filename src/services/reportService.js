export function createReportService({ publicFunctionRequest, rawDevicePost, supabaseUrl, getHeaders }) {
  function loadVenueReports(venueId) {
    return publicFunctionRequest("reports-feed", { venue_id: venueId });
  }

  function syncReportWithoutLocation(payload) {
    return rawDevicePost("/functions/v1/location-ingest", payload, getHeaders()).then(function(response) {
      return response.json().catch(function() {
        return {};
      }).then(function(data) {
        if (!response.ok) throw new Error(data.error || "report sync failed");
        data.unverified_account_report = true;
        return data;
      });
    });
  }

  return { loadVenueReports, syncReportWithoutLocation };
}
