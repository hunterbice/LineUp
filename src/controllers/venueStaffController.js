export function createVenueStaffController(deps) {
  return {
    selectVenue(id) {
      deps.setAdminVenue(id);
      deps.renderAdminSheet();
    },
    patch(id, patch) {
      if (!deps.canAdminVenue(id)) return deps.showToast("That venue is locked");
      deps.showToast("Publishing staff update...");
      return deps.syncVenueAdminToSupabase(id, patch).then(function(){
        deps.refreshCurrentVenue(id);
        deps.renderAdminSheet();
        deps.renderDetailIfOpen(id);
        deps.showToast("Venue source synced");
      }).catch(function(err){
        deps.showToast(err&&err.message?err.message:"Staff update failed");
      });
    },
    applyFields(id) {
      return deps.applyFields(id);
    },
  };
}
