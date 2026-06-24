import { esc } from "../utils/dom.js";
import { renderAvatarEditor } from "./renderProfilePhoto.js";

function passwordEye() {
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>';
}

export function renderAccountGateHtml() {
  return `<section class="accountGate authGate">
    <div class="gateMark"><img src="/icons/icon-192.png" alt="" aria-hidden="true"></div>
    <span class="earlyAccessPill">ARIZONA FALL EARLY ACCESS</span>
    <h1>Know Before You Go.</h1>
    <p class="authSub">LineUp is launching at Arizona this fall. Join early access to save favorite spots, request launch deals, and get first access when live crowd updates turn on.</p>
    <div class="authBenefits">
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/></svg></span><b>Save favorites</b></div>
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M12 3v18"/></svg></span><b>Request launch deals</b></div>
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z"/></svg></span><b>Choose public or anonymous</b></div>
    </div>
    <input type="radio" name="authMode" id="authModeSignin" class="authModeInput" checked><input type="radio" name="authMode" id="authModeCreate" class="authModeInput">
    <div class="authToggle"><label for="authModeSignin" onclick="setAuthPasswordMode(false)">Sign in</label><label for="authModeCreate" onclick="setAuthPasswordMode(true)">Create account</label></div>
    <label class="fieldLabel" for="authEmail">Email</label><input class="field" id="authEmail" type="email" autocomplete="email" placeholder="you@email.com">
    <label class="fieldLabel" for="authPassword">Password</label><div class="passwordField"><input class="field" id="authPassword" type="password" autocomplete="current-password" placeholder="6+ characters"><button type="button" class="passwordToggle" aria-label="Show password" onclick="togglePasswordVisibility('authPassword',this)">${passwordEye()}</button></div>
    <div class="authNameField"><label class="fieldLabel" for="authName">Display name</label><input class="field" id="authName" maxlength="32" placeholder="Display name"><small class="authHelper">Shown on reports if you choose not to appear anonymous.</small></div>
    <button class="submit authCta authCtaSignin" onclick="submitEmailAuth('signin')">Sign In</button><button class="submit authCta authCtaCreate" onclick="submitEmailAuth('signup')">Join Early Access</button>
    <p class="rewardFine authLegal">By continuing, you agree to LineUp’s <button class="linkBtn" onclick="showLegalSheet('privacy')">Privacy</button> and <button class="linkBtn" onclick="showLegalSheet('terms')">Terms</button>.</p>
  </section>`;
}

export function renderSetupGateHtml({ mode, displayName, avatarUrl }) {
  return `<section class="accountGate setupGate"><span class="earlyAccessPill">EARLY ACCESS</span><h1>Set Up LineUp</h1><p>Confirm your campus and choose how you appear. You’re ready for fall in a few taps.</p><label class="fieldLabel">Profile photo</label>${renderAvatarEditor("setup", avatarUrl)}<p class="rewardFine photoOptional">Optional. You can add or change this later.</p><label class="fieldLabel">Campus</label><select class="field" id="setupCampus"><option value="university_of_arizona">University of Arizona</option></select><p class="rewardFine">Campus selection lets you use LineUp without location permission.</p><label class="fieldLabel" for="setupName">Display name</label><input class="field" id="setupName" maxlength="32" value="${esc(displayName || "")}" placeholder="Display name"><label class="fieldLabel">Public mode</label><div class="identityToggle"><button class="${mode === "anonymous" ? "on" : ""}" onclick="setInteractionVisibility('anonymous')">Anonymous</button><button class="${mode === "public" ? "on" : ""}" onclick="setInteractionVisibility('public')">Public</button></div><p class="rewardFine">Anonymous Mode shows structured reports as “Anonymous User.” LineUp still links activity to your account for moderation and safety.</p><button class="submit" onclick="saveSetup()">Join Arizona Early Access</button><p class="rewardFine">Notifications and location are optional. LineUp will explain each one next.</p></section>`;
}

function permissionResult(status) {
  const labels = {
    granted: ["Enabled", "Permission confirmed by this device."],
    denied: ["Not enabled", "You can change this later in device settings."],
    default: ["Not decided", "LineUp will continue without notifications."],
    prompt: ["Not decided", "LineUp will continue without location."],
    unavailable: ["Unavailable", "This browser does not offer this permission."],
    unknown: ["Not confirmed", "Check device settings if you want to enable it later."],
  };
  const value = labels[status] || labels.unknown;
  return `<div class="permissionResult result-${esc(status || "unknown")}"><b>${value[0]}</b><span>${value[1]}</span></div>`;
}

export function renderPermissionEducationHtml({ step = "notifications", status = "default", attempted = false, busy = false } = {}) {
  const notification = step === "notifications";
  const title = notification ? "Stay in the loop" : "Make nearby reads better";
  const copy = notification
    ? "Get saved venue updates, new deals, launch news, and important LineUp alerts. Notifications are optional."
    : "Location helps with nearby venues, verified check-ins, reports, and campus relevance while LineUp is open. Location is optional.";
  const enableLabel = notification ? "Enable Notifications" : "Enable Location";
  const stepLabel = notification ? "STEP 1 OF 2" : "STEP 2 OF 2";
  const icon = notification
    ? '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
    : '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.1 7-11a7 7 0 0 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  const actions = attempted
    ? `<button class="submit" onclick="continuePermissionEducation('${step}')">${notification ? "Continue" : "Enter LineUp"}</button>`
    : `<button class="submit" ${busy ? "disabled" : ""} onclick="enableSetupPermission('${step}')">${busy ? "Checking…" : enableLabel}</button><button class="permissionSkip" type="button" ${busy ? "disabled" : ""} onclick="skipSetupPermission('${step}')">Not Now</button>`;
  return `<section class="accountGate permissionGate" data-permission-step="${step}"><span class="earlyAccessPill">${stepLabel}</span><div class="permissionHeroIcon">${icon}</div><h1>${title}</h1><p>${copy}</p>${attempted ? permissionResult(status) : ""}<div class="permissionActions">${actions}</div><p class="rewardFine">You can change this later from Profile → Preferences.</p></section>`;
}
