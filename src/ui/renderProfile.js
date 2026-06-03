import { esc } from "../utils/dom.js";
import { timeAgo } from "../utils/time.js";

function menu(label, view, meta, svg) {
  return `<button class="profileMenuItem" onclick="openProfileView('${view}')"><span><b>${label}</b><small>${meta||""}</small></span>${svg.chevRight}</button>`;
}

function trustLabel(tier) {
  return tier==="trusted"?"Trusted Reporter":tier==="normal"?"Building Trust":tier==="flagged"?"Needs Review":tier==="venue_staff"?"Venue Staff":tier==="owner"?"Owner":"New Reporter";
}

export function renderRewardsHtml({ rewardViewState }) {
  const state = rewardViewState ? rewardViewState() : {};
  state.points = Number(state.points || 0);
  state.goal = Number(state.goal || 500);
  state.redeemed = Number(state.redeemed || 0);
  const pct = Math.min(100, Math.round((state.points/state.goal)*100));
  const left = Math.max(0, state.goal-state.points);
  const latest = state.redemptions&&state.redemptions[0];
  const fine = state.server ? "Server-backed balance · "+state.redeemed+" skips redeemed"+(latest?" · latest "+esc(latest.code):"") : "Rewards require the secure LineUp ledger. Points do not redeem from local device storage.";
  return `<div class="sectionlabel">REWARDS</div><div class="card rewardsHero"><div class="rewardTop"><div><b>LineUp Rewards</b><p class="muted" style="margin-top:7px">Earn points for useful nightlife signals. A free LineUp Skip should take real participation, not one night of taps.</p></div><div class="points">${state.points}</div></div><div class="rewardProgress" aria-label="${pct}% to LineUp Skip"><div style="width:${pct}%"></div></div><div class="row"><span class="muted">${left?left+" pts until free LineUp Skip":"Ready to redeem"}</span><b>${pct}%</b></div><button class="submit" onclick="redeemSkip()">${state.points>=state.goal?"Redeem LineUp Skip":"LineUp Skip locked"}</button><div class="rewardFine">${fine}</div></div><div class="card"><b>How to earn</b><div class="rewardRules"><div class="rewardRule"><b>Fresh crowd or line report</b><span>10 pts</span></div><div class="rewardRule"><b>Verified nearby report</b><span>15 pts</span></div><div class="rewardRule"><b>Verified check-in</b><span>15 pts</span></div><div class="rewardRule"><b>Approved venue insight</b><span>20 pts</span></div><div class="rewardRule"><b>Bring a friend onto LineUp</b><span>25 pts</span></div><div class="rewardRule"><b>Useful weekly streak</b><span>30 pts</span></div></div><p class="rewardFine">Anti-spam rules now live on the backend: report points cap at 3 per night, check-ins cap at 3 per night, and redemptions spend from the server ledger.</p></div>`;
}

export function renderProfileQualityHtml(profileSummary) {
  const profile = profileSummary || {};
  const score = Math.round(Number(profile.reliability_score||0.5)*100);
  const tier = profile.trust_tier || "new";
  return `<div class="sectionlabel">SIGNAL PROFILE</div><div class="card"><b>Your signal quality</b><div class="trustBadge">${trustLabel(tier)} · ${score}%</div><p class="muted intelCopy">LineUp weighs verified reports and check-ins more heavily over time. Reports that agree with later staff, scout, and nearby signals increase trust; conflicting reports reduce it.</p><div class="profileGrid"><div class="profileStat"><b>${Number(profile.report_count||0)}</b><span>Total reports</span></div><div class="profileStat"><b>${Number(profile.verified_report_count||0)}</b><span>Verified reports</span></div><div class="profileStat"><b>${Number(profile.checkin_count||0)}</b><span>Check-ins</span></div><div class="profileStat"><b>${Number(profile.agreement_count||0)}</b><span>Agreements</span></div><div class="profileStat"><b>${Number(profile.disagreement_count||0)}</b><span>Conflicts</span></div><div class="profileStat"><b>${Number(profile.presence_count||0)}</b><span>Presence reads</span></div></div><div class="rewardFine">Last report: ${timeAgo(profile.last_report_at)} · Last check-in: ${timeAgo(profile.last_checkin_at)}</div></div>`;
}

export function legalCopy(kind) {
  if (kind==="terms") return { title:"Terms of Service", body:"Use LineUp responsibly. Do not post fake reports, unsafe content, harassment, or venue misinformation. Rewards and venue data can be changed, revoked, or corrected when abuse or errors are found. LineUp is an informational nightlife tool, not a guarantee of entry, safety, pricing, event availability, or wait time." };
  return { title:"Privacy & Data", body:"LineUp collects account email, Apple login identifiers when added, display name, profile photo, favorite bars, reports, comments and photos when available, precise foreground location snapshots when location is enabled, notification preferences, device/session/auth metadata, app activity, rewards activity, and moderation metadata. Public anonymous mode changes display only; internal account IDs and operating data remain available for trust, abuse prevention, rewards, safety review, owner analytics, and live app operations." };
}

export function renderLegalSheetHtml(kind) {
  const copy = legalCopy(kind);
  return `<h2>${esc(copy.title)}</h2><p class="sheetIntro">${esc(copy.body)}</p><button class="submit" onclick="closeSheet()">Close</button>`;
}

export function renderProfilePageHtml(view, ctx) {
  ctx = ctx || {};
  const { svg = {}, accountPrefs = {}, authState = null, favs = [], activeBars = function(){return[]}, isFav = function(){return false}, interactionVisibility = function(){return"anonymous"}, publicName = function(){return"LineUp User"}, profileAvatar = function(){return"L"}, rewardViewState = function(){return{points:0,goal:500}}, profileSummary = null, presenceState = null, presenceCopy = function(){return{title:"Off",detail:"Tap to enable while using"}}, prefStatus = function(){return"unset"}, cap = function(value){return String(value||"")} } = ctx;
  const mode = interactionVisibility();
  const views = {
    home() {
      const status = authState&&authState.email?authState.email:"Signed account";
      return `<div class="profileHero accountHero"><div class="profileMark">${profileAvatar()}</div><h1>${esc(publicName())}</h1><p class="muted">${esc(status)} · ${mode==="anonymous"?"Publicly anonymous":"Public profile on"}</p><button class="secondaryBtn compactBtn" onclick="openProfileView('edit')">Edit Profile</button></div><div class="profileMenu">${menu("Edit Profile","edit","Photo, display name, anonymous mode",svg)}${menu("Favorites","favorites",favs.length+" saved bars",svg)}${menu("Preferences","preferences","Notifications and location",svg)}${menu("LineUp Rewards","rewards",(rewardViewState().points||0)+" points",svg)}${menu("Privacy & Data","privacy","Privacy, data usage, terms",svg)}${menu("Help / Support","help","Contact and safety",svg)}</div>${renderProfileQualityHtml(profileSummary)}<button class="secondaryBtn logoutBtn" onclick="signOutAccount()">Log Out</button>`;
    },
    edit() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">EDIT PROFILE</div><div class="card accountCard"><div class="profileMark smallAvatar">${profileAvatar()}</div><label class="fieldLabel">Profile photo</label><input class="field" type="file" accept="image/*" onchange="handleAvatarFile(this)"><label class="fieldLabel">Display name</label><div class="adminMini"><input class="field" id="displayNameField" value="${esc(accountPrefs.display_name||"")}" maxlength="32" placeholder="Display name"><button class="secondaryBtn" onclick="saveDisplayName()">Save</button></div><label class="fieldLabel">Anonymous mode</label><div class="identityToggle"><button class="${mode==="anonymous"?"on":""}" onclick="setInteractionVisibility('anonymous')">Anonymous</button><button class="${mode==="public"?"on":""}" onclick="setInteractionVisibility('public')">Public</button></div><p class="rewardFine">Anonymous Mode: When enabled, your public posts and reports show as “Anonymous User.” LineUp can still link activity to your account for moderation and safety.</p></div>`;
    },
    favorites() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">FAVORITES</div><div class="card"><b>Your Favorite Bars</b><p class="muted intelCopy">Favorites are saved to your account and appear first in Live.</p><div class="favSetup allFavs">${activeBars().map(bar=>`<button class="${isFav(bar.id)?"on":""}" onclick="toggleFav('${bar.id}')">${esc(bar.name)}</button>`).join("")}</div></div>`;
    },
    preferences() {
      const pc = presenceCopy(), n = prefStatus("notification"), l = prefStatus("location");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">PREFERENCES</div><div class="card permission"><b>Notifications</b><p class="muted intelCopy">Get future alerts when a favorite bar gets packed, a line gets short, events go live, or rewards update.</p><div class="rewardRule"><b>Status</b><span>${esc(cap(n))}</span></div><button class="submit" onclick="requestNotifications()">Enable Notifications</button></div><div class="card permission"><b>Location</b><p class="muted intelCopy">Enable location to improve nearby bar accuracy and live crowd reports while the app is open.</p><div class="locationStatus"><b>${esc(pc.title)}</b><span>${esc(pc.detail)}</span></div><div class="rewardRule"><b>Preference</b><span>${esc(cap(l))}</span></div><button class="submit" onclick="requestSetupLocation()">${presenceState?"Refresh Location":"Enable Location"}</button></div>`;
    },
    rewards() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button>${renderRewardsHtml({rewardViewState})}<details class="card photoPanel" open><summary>How to Earn <span class="muted">Open</span></summary><p class="muted intelCopy">Submit accurate crowd reports, add useful line photos, post highlights, report fake or outdated info, and use LineUp consistently.</p></details><details class="card photoPanel"><summary>What Rewards Can Be Used For <span class="muted">Open</span></summary><p class="muted intelCopy">Rewards are designed for future LineUp Skip credits, partner perks, and campus nightlife benefits once venue operations are ready.</p></details><details class="card photoPanel"><summary>Rules <span class="muted">Open</span></summary><p class="muted intelCopy">Points are server-backed, capped per night, and tied to verified account activity. Fake or spammy reports can lose trust or rewards.</p></details>`;
    },
    privacy() {
      const copy = legalCopy("privacy");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">PRIVACY & DATA</div><div class="card"><b>${copy.title}</b><p class="muted intelCopy">${copy.body}</p><div class="profileMenu">${menu("Privacy Policy","privacy","What LineUp collects and why",svg)}${menu("Terms of Service","terms","Use rules and limitations",svg)}</div></div>`;
    },
    terms() {
      const copy = legalCopy("terms");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">TERMS</div><div class="card"><b>${copy.title}</b><p class="muted intelCopy">${copy.body}</p><div class="profileMenu">${menu("Privacy Policy","privacy","What LineUp collects and why",svg)}${menu("Terms of Service","terms","Use rules and limitations",svg)}</div></div>`;
    },
    help() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">HELP</div><div class="card"><b>Support</b><p class="muted intelCopy">For now, send bugs, venue corrections, safety issues, or account questions to the LineUp owner. Owner tools can investigate abuse without exposing private identity publicly.</p><button class="submit" onclick="showToast('Support channel coming soon')">Contact Support</button></div>`;
    }
  };
  return (views[view] || views.home)();
}
