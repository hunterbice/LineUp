const PULL_THRESHOLD = 64;
const MAX_PULL = 104;
const HOLD_DISTANCE = 54;

export function createPullToRefreshController(deps) {
  let startX = 0;
  let startY = 0;
  let distance = 0;
  let pulling = false;
  let refreshing = false;
  let content = null;
  let indicator = null;
  let label = null;

  function interactiveTarget(target) {
    return target && target.closest && target.closest("button,input,select,textarea,a,[role='button'],.sheet");
  }

  function activeSurface() {
    const detail = deps.detailElement();
    if (detail && detail.classList.contains("open")) {
      return detail.scrollTop <= 1 ? { content: detail.querySelector(".detailStage"), kind: "detail" } : null;
    }
    if (!deps.pageCanRefresh() || deps.windowScrollTop() > 1) return null;
    return { content: deps.appElement(), kind: "page" };
  }

  function setOffset(value, animate) {
    if (!content) return;
    content.classList.toggle("ptr-animate", Boolean(animate));
    content.style.setProperty("--pull-distance", `${Math.max(0, value)}px`);
  }

  function updateIndicator(value) {
    const ready = value >= PULL_THRESHOLD;
    indicator.classList.add("visible");
    indicator.classList.toggle("ready", ready);
    indicator.style.setProperty("--pull-progress", String(Math.min(1, value / PULL_THRESHOLD)));
    label.textContent = ready ? "Release to refresh" : "Pull to refresh";
  }

  function settle() {
    setOffset(0, true);
    indicator.classList.remove("visible", "ready", "loading");
    indicator.style.removeProperty("--pull-progress");
    label.textContent = "Pull to refresh";
    delete document.body.dataset.pullGesture;
    const previous = content;
    setTimeout(() => {
      if (previous) previous.classList.remove("ptr-animate");
      if (content === previous) content = null;
    }, deps.prefersReducedMotion() ? 20 : 280);
  }

  function runRefresh(kind) {
    refreshing = true;
    document.body.dataset.pullRefreshing = "true";
    indicator.classList.add("visible", "loading");
    label.textContent = "Refreshing…";
    setOffset(HOLD_DISTANCE, true);
    return Promise.resolve(deps.refresh(kind)).catch((error) => {
      if (deps.onError) deps.onError(error);
    }).finally(() => {
      refreshing = false;
      delete document.body.dataset.pullRefreshing;
      settle();
    });
  }

  function onStart(event) {
    if (refreshing || event.touches.length !== 1 || interactiveTarget(event.target)) return;
    const surface = activeSurface();
    if (!surface || !surface.content) return;
    content = surface.content;
    content.dataset.pullSurface = surface.kind;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    distance = 0;
    pulling = true;
    document.body.dataset.pullGesture = "true";
  }

  function onMove(event) {
    if (!pulling || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
      pulling = false;
      settle();
      return;
    }
    distance = Math.min(MAX_PULL, dy * 0.5);
    if (dy > 5) event.preventDefault();
    setOffset(distance, false);
    updateIndicator(distance);
  }

  function onEnd() {
    if (!pulling) return;
    pulling = false;
    const kind = content && content.dataset.pullSurface || "page";
    if (distance >= PULL_THRESHOLD) runRefresh(kind);
    else settle();
  }

  function mount() {
    indicator = document.createElement("div");
    indicator.className = "ptr";
    indicator.setAttribute("aria-live", "polite");
    indicator.innerHTML = '<span class="ptr-spin" aria-hidden="true"></span><b>Pull to refresh</b>';
    label = indicator.querySelector("b");
    document.body.appendChild(indicator);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
  }

  return { mount, testHooks: { activeSurface, onStart, onMove, onEnd } };
}
