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
    }).catch(function(){
      deps.clearOwnerData();
      if (showToast) deps.showToast("Owner access denied");
    });
  }
  return {
    refresh: function(){return refresh(true)},
    refreshSilent: function(){
      if (deps.activePage()!=="statsPage"||!deps.isOwnerAccount()||document.visibilityState==="hidden") return;
      return deps.ownerRequest().then(function(){if(deps.activePage()==="statsPage"&&deps.isOwnerAccount())deps.renderOwnerDashboard()}).catch(function(){});
    },
    publishVenue: function(payload){return deps.publishVenue(payload)},
    setVenueStatus: function(status){return deps.setVenueStatus(status)},
    setRedemption: function(id,status){return deps.setRedemption(id,status)},
    openVenue: function(id){return deps.openVenue(id)},
    exit: function(){deps.clearOwnerData();deps.closeOwnerMap();deps.setPage("profilePage");deps.showToast("Owner tools closed")},
  };
}
