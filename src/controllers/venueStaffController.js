export function createVenueStaffController(deps) {
  return {
    selectVenue(id) {
      if (!id) {
        deps.showToast("Choose a venue first");
        return;
      }
      deps.setAdminVenue(id);
      deps.renderAdminSheet();
    },
    patch(id, patch) {
      if (!id) return deps.showToast("Choose a venue first");
      if (!patch || typeof patch !== "object") return deps.showToast("No venue update selected");
      if (!deps.canAdminVenue(id)) return deps.showToast("That venue is locked");
      deps.showToast("Publishing staff update...");
      return deps.syncVenueAdminToSupabase(id, patch).then(function(){
        deps.refreshCurrentVenue(id);
        deps.renderAdminSheet();
        deps.renderDetailIfOpen(id);
        deps.showToast("Venue source synced");
      }).catch(function(err){
        if (deps.logError) deps.logError("staff_update_failed", err);
        deps.showToast(err&&err.message?err.message:"Staff update failed");
      });
    },
    applyFields(id) {
      return deps.applyFields(id);
    },
  };
}
