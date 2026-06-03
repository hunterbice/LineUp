import * as cacheState from "../state/cacheState.js";

function installPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function shouldShowInstallPrompt() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    cacheState.markPwaInstalled();
    return false;
  }
  const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  if (!isMobile) return false;
  const promptState = cacheState.getInstallPromptState();
  if (promptState.completed) return false;
  if (promptState.installed) return false;
  const dismissedAt = promptState.dismissedAt;
  return !(dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000);
}

export function createInstallPromptController() {
  let deferredPrompt = null;

  function showInstallPrompt() {
    const primaryBtn = document.getElementById("installPrimary");
    const steps = document.getElementById("installSteps");
    const footer = document.querySelector(".install-footer");
    const platform = installPlatform();
    if (deferredPrompt) {
      primaryBtn.textContent = "Add to Home Screen";
      document.querySelector(".install-secondary").textContent = "Not now";
      steps.style.display = "none";
    } else {
      primaryBtn.textContent = platform === "ios" ? "I’ll add it after" : "Continue to LineUp";
      document.querySelector(".install-secondary").textContent = "Remind me later";
      steps.style.display = "";
    }
    footer.textContent = platform === "ios" ? "Safari requires the Share button for Home Screen install." : "Add LineUp to your home screen for faster access.";
    document.getElementById("installPrompt").classList.add("open");
    document.getElementById("app").classList.add("install-open");
  }

  function hideInstallPrompt() {
    document.getElementById("installPrompt").classList.remove("open");
    document.getElementById("app").classList.remove("install-open");
  }

  function handleInstallPrimary() {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      prompt.prompt();
      prompt.userChoice.then(function(choice) {
        if (choice.outcome === "accepted") cacheState.markInstallPromptCompleted();
        else cacheState.markInstallPromptDismissed();
        hideInstallPrompt();
      });
      return;
    }
    cacheState.markInstallPromptDismissed();
    hideInstallPrompt();
  }

  function handleInstallSecondary() {
    cacheState.markInstallPromptDismissed();
    hideInstallPrompt();
  }

  function registerInstallEvents() {
    window.addEventListener("beforeinstallprompt", function(event) {
      event.preventDefault();
      deferredPrompt = event;
    });
    window.addEventListener("appinstalled", function() {
      cacheState.markPwaInstalled();
      cacheState.markInstallPromptCompleted();
      hideInstallPrompt();
    });
  }

  function maybeShowAfterSplash() {
    if (shouldShowInstallPrompt()) showInstallPrompt();
  }

  return { handleInstallPrimary, handleInstallSecondary, registerInstallEvents, maybeShowAfterSplash };
}
