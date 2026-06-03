export function createOwnerController(deps) {
  function refresh(showToast) {
    if (!deps.isOwnerAccount()) {
      if (showToast) deps.showToast("Owner account required");
      return Promise.resolve(null);
    }
    if (showToast) deps.showToast("Refreshing owner data...");
    return deps.ownerRequest().then(function(){
      deps.renderOwnerDashboard();
      if (showToast) deps.showToast("Owner data refreshed");
    }).catch(function(error){
      deps.clearOwnerData();
      if (deps.logError) deps.logError("owner_refresh_failed", error);
      if (showToast) deps.showToast("Owner access denied");
    });
  }
  return {
    refresh: function(){return refresh(true)},
    refreshSilent: function(){
      if (deps.activePage()!=="statsPage"||!deps.isOwnerAccount()||document.visibilityState==="hidden") return;
      return deps.ownerRequest().then(function(){if(deps.activePage()==="statsPage"&&deps.isOwnerAccount())deps.renderOwnerDashboard()}).catch(function(error){if(deps.logError)deps.logError("owner_refresh_silent_failed", error)});
    },
    publishVenue: function(payload){if(!deps.isOwnerAccount())return refresh(true);return deps.publishVenue(payload)},
    setVenueStatus: function(status){if(!status)return Promise.resolve(null);if(!deps.isOwnerAccount())return refresh(true);return deps.setVenueStatus(status)},
    setRedemption: function(id,status){if(!id||!status){deps.showToast("Choose a redemption first");return Promise.resolve(null)}return deps.setRedemption(id,status)},
    openVenue: function(id){if(!id){deps.showToast("Choose a venue first");return Promise.resolve(null)}return deps.openVenue(id)},
    exit: function(){deps.clearOwnerData();deps.closeOwnerMap();deps.setPage("profilePage");deps.showToast("Owner tools closed")},
  };
}
