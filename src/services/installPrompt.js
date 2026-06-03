function installPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function shouldShowInstallPrompt() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    localStorage.setItem("lineup_pwa_installed", "true");
    return false;
  }
  const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  if (!isMobile) return false;
  if (localStorage.getItem("lineup_install_prompt_completed") === "true") return false;
  if (localStorage.getItem("lineup_pwa_installed") === "true") return false;
  const dismissedAt = Number(localStorage.getItem("lineup_install_prompt_dismissed_at") || 0);
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
        localStorage.setItem(choice.outcome === "accepted" ? "lineup_install_prompt_completed" : "lineup_install_prompt_dismissed_at", choice.outcome === "accepted" ? "true" : Date.now().toString());
        hideInstallPrompt();
      });
      return;
    }
    localStorage.setItem("lineup_install_prompt_dismissed_at", Date.now().toString());
    hideInstallPrompt();
  }

  function handleInstallSecondary() {
    localStorage.setItem("lineup_install_prompt_dismissed_at", Date.now().toString());
    hideInstallPrompt();
  }

  function registerInstallEvents() {
    window.addEventListener("beforeinstallprompt", function(event) {
      event.preventDefault();
      deferredPrompt = event;
    });
    window.addEventListener("appinstalled", function() {
      localStorage.setItem("lineup_pwa_installed", "true");
      localStorage.setItem("lineup_install_prompt_completed", "true");
      hideInstallPrompt();
    });
  }

  function maybeShowAfterSplash() {
    if (shouldShowInstallPrompt()) showInstallPrompt();
  }

  return { handleInstallPrimary, handleInstallSecondary, registerInstallEvents, maybeShowAfterSplash };
}
