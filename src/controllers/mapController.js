export function createMapController(deps) {
  return {
    render() {
      if (!deps.renderMap) return;
      return deps.renderMap();
    },
    loadMapbox() {
      return deps.loadMapbox();
    },
    initRealMap() {
      return deps.initRealMap();
    },
    renderFallback() {
      return deps.renderFallbackMap();
    },
  };
}
