import { esc } from "../utils/dom.js";

export function renderAccountGateHtml() {
  return `<section class="accountGate authGate">
    <div class="gateMark"><img src="/icons/icon-192.png" alt="" aria-hidden="true"></div>
    <h1>Join LineUp</h1>
    <p class="authSub">Save your spots, keep rewards, and report anonymously.</p>
    <div class="authBenefits">
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/></svg></span><b>Save favorites</b></div>
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9M12 8S11 3 8 3a2 2 0 0 0 0 5zM12 8s1-5 4-5a2 2 0 0 1 0 5z"/></svg></span><b>Track rewards</b></div>
      <div class="authBenefit"><span class="authBenefitIcon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z"/></svg></span><b>Report anonymously</b></div>
    </div>
    <input type="radio" name="authMode" id="authModeSignin" class="authModeInput" checked><input type="radio" name="authMode" id="authModeCreate" class="authModeInput">
    <div class="authToggle"><label for="authModeSignin">Sign in</label><label for="authModeCreate">Create account</label></div>
    <label class="fieldLabel" for="authEmail">Email</label><input class="field" id="authEmail" type="email" autocomplete="email" placeholder="you@email.com">
    <label class="fieldLabel" for="authPassword">Password</label><input class="field" id="authPassword" type="password" autocomplete="current-password" placeholder="6+ characters">
    <div class="authNameField"><label class="fieldLabel" for="authName">Display name</label><input class="field" id="authName" maxlength="32" placeholder="Display name"><small class="authHelper">Shown on reports if you choose not to appear anonymous.</small></div>
    <button class="submit authCta authCtaSignin" onclick="submitEmailAuth('signin')">Sign In</button><button class="submit authCta authCtaCreate" onclick="submitEmailAuth('signup')">Create Account</button>
    <p class="rewardFine authLegal">By continuing, you agree to LineUp’s <button class="linkBtn" onclick="showLegalSheet('privacy')">Privacy</button> and <button class="linkBtn" onclick="showLegalSheet('terms')">Terms</button>.</p>
  </section>`;
}

export function renderSetupGateHtml({ mode, avatarHtml, displayName, favoritesHtml }) {
  return `<section class="accountGate setupGate"><div class="profileMark setupAvatar">${avatarHtml}</div><h1>Set Up LineUp</h1><p>Keep it fast: choose how you appear, pick favorites, and enable the permissions that make live reads smarter.</p><label class="fieldLabel">Profile photo</label><input class="field" type="file" accept="image/*" onchange="handleAvatarFile(this)"><label class="fieldLabel">Display name</label><input class="field" id="setupName" maxlength="32" value="${esc(displayName || "")}" placeholder="Display name"><label class="fieldLabel">Public mode</label><div class="identityToggle"><button class="${mode === "anonymous" ? "on" : ""}" onclick="setInteractionVisibility('anonymous')">Anonymous</button><button class="${mode === "public" ? "on" : ""}" onclick="setInteractionVisibility('public')">Public</button></div><p class="rewardFine">Anonymous Mode shows public posts and reports as “Anonymous User.” LineUp still links activity to your account for moderation and safety.</p><div class="sectionlabel">Favorite bars</div><div class="favSetup">${favoritesHtml}</div><div class="sheetActions"><button class="secondaryBtn" onclick="requestNotifications()">Notifications</button><button class="secondaryBtn" onclick="requestSetupLocation()">Location</button></div><button class="submit" onclick="saveSetup()">Finish Setup</button><p class="rewardFine">Permissions are optional and can be changed later in Preferences.</p></section>`;
}
