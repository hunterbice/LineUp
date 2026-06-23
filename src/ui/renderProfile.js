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
  if (!profileSummary) return `<div class="sectionlabel">SIGNAL PROFILE</div><div class="card profileSkeleton" aria-label="Loading signal profile"><span class="skeletonLine short"></span><span class="skeletonLine title"></span><span class="skeletonLine"></span><div class="profileGrid"><span class="skeletonButton"></span><span class="skeletonButton"></span><span class="skeletonButton"></span></div></div>`;
  const profile = profileSummary || {};
  const score = Math.round(Number(profile.reliability_score||0.5)*100);
  const tier = profile.trust_tier || "new";
  return `<div class="sectionlabel">SIGNAL PROFILE</div><div class="card"><b>Your signal quality</b><div class="trustBadge">${trustLabel(tier)} · ${score}%</div><p class="muted intelCopy">LineUp weighs verified reports and check-ins more heavily over time. Reports that agree with later staff, scout, and nearby signals increase trust; conflicting reports reduce it.</p><div class="profileGrid"><div class="profileStat"><b>${Number(profile.report_count||0)}</b><span>Total reports</span></div><div class="profileStat"><b>${Number(profile.verified_report_count||0)}</b><span>Verified reports</span></div><div class="profileStat"><b>${Number(profile.checkin_count||0)}</b><span>Check-ins</span></div><div class="profileStat"><b>${Number(profile.agreement_count||0)}</b><span>Agreements</span></div><div class="profileStat"><b>${Number(profile.disagreement_count||0)}</b><span>Conflicts</span></div><div class="profileStat"><b>${Number(profile.presence_count||0)}</b><span>Presence reads</span></div></div><div class="rewardFine">Last report: ${timeAgo(profile.last_report_at)} · Last check-in: ${timeAgo(profile.last_checkin_at)}</div></div>`;
}

export function legalCopy(kind) {
  if (kind==="terms") return { title:"Terms of Use", sections:[
    ["Informational service","LineUp provides venue, deal, crowd, and wait estimates for planning. Information may be incomplete, delayed, or unavailable."],
    ["Venue rules","Verify age, identification, dress code, entry, pricing, deal terms, accessibility, safety, and operating hours directly with the venue. LineUp does not guarantee entry, wait time, deal availability, or venue status."],
    ["Acceptable use","Do not submit false reports, automate requests, abuse rewards, impersonate others, harass users or venues, or interfere with LineUp systems."],
    ["Accounts and availability","LineUp may correct inaccurate data, remove abusive activity, restrict accounts, or change Early Access features. Venue-posted deal terms may vary or end early."],
    ["Contact","Questions about these terms can be sent to support@get-lineup.app."],
  ] };
  return { title:"Privacy Policy", sections:[
    ["Data we collect","LineUp collects account email, display name, optional profile photo, campus selection, favorites, launch-deal requests, structured crowd reports, reward activity, notification preference, and owner or staff role information when applicable."],
    ["Location","If you allow location while using LineUp, we collect foreground coordinates, accuracy, nearby venue distance, and presence/check-in signals. Location is optional; you can select University of Arizona and browse manually without granting it."],
    ["Device and app activity","We use signed-device and session identifiers, venue/detail/deal interactions, diagnostics, and limited security logs to operate the app, prevent abuse, measure aggregate interest, and improve crowd estimates."],
    ["How data is shared","Venue operators may receive aggregate deal interest and performance totals. They do not receive raw launch-request identities or individual location histories. Service providers such as Supabase and Mapbox process data needed to run LineUp."],
    ["Retention and deletion","Operational records are retained only as needed for the service, safety, fraud prevention, and aggregate analytics. Deleting your account removes your profile, favorites, devices, precise presence/check-in history, rewards, launch requests, and reports; non-identifying aggregate venue statistics may remain."],
    ["Your choices","You can use anonymous display mode, decline location and notifications, change preferences, or delete your account in Profile > Account & Access."],
    ["Contact","Privacy and account questions can be sent to support@get-lineup.app."],
  ] };
}

function legalSections(copy) {
  return (copy.sections || []).map(function(section) { return `<section class="legalSection"><h3>${esc(section[0])}</h3><p>${esc(section[1])}</p></section>`; }).join("");
}

export function renderLegalSheetHtml(kind) {
  const copy = legalCopy(kind);
  return `<h2>${esc(copy.title)}</h2><div class="legalCopy">${legalSections(copy)}</div><a class="secondaryBtn legalLink" href="/legal/${kind === "terms" ? "terms" : "privacy"}.html" target="_blank" rel="noopener">Open full page</a><button class="submit" onclick="closeSheet()">Close</button>`;
}

export function renderProfilePageHtml(view, ctx) {
  ctx = ctx || {};
  const { svg = {}, accountPrefs = {}, authState = null, favs = [], activeBars = function(){return[]}, isFav = function(){return false}, interactionVisibility = function(){return"anonymous"}, publicName = function(){return"LineUp User"}, profileAvatar = function(){return"L"}, rewardViewState = function(){return{points:0,goal:500}}, profileSummary = null, presenceState = null, presenceCopy = function(){return{title:"Off",detail:"Tap to enable while using"}}, prefStatus = function(){return"unset"}, cap = function(value){return String(value||"")}, earlyAccess = {} } = ctx;
  const mode = interactionVisibility();
  const views = {
    home() {
      const status = authState&&authState.email?authState.email:"Signed account";
      return `<div class="profileHero accountHero"><div class="profileMark">${profileAvatar()}</div><span class="earlyAccessPill">${earlyAccess.joined?"ARIZONA EARLY ACCESS":"EARLY ACCESS AVAILABLE"}</span><h1>${esc(publicName())}</h1><p class="muted">${esc(status)} · ${mode==="anonymous"?"Publicly anonymous":"Public profile on"}</p><button class="secondaryBtn compactBtn" onclick="openProfileView('edit')">Edit Profile</button></div><div class="profileMenu">${menu("Edit Profile","edit","Photo, display name, anonymous mode",svg)}${menu("Favorites","favorites",favs.length+" saved bars",svg)}${menu("Preferences","preferences","Campus, notifications, and location",svg)}${menu("LineUp Rewards","rewards",(rewardViewState().points||0)+" points",svg)}${menu("Privacy Policy","privacy","What LineUp collects and why",svg)}${menu("Terms of Use","terms","Use rules and limitations",svg)}${menu("Help / Support","help","Contact, corrections, and bugs",svg)}${menu("Account & Access","account","Sign out or delete your account",svg)}</div>${renderProfileQualityHtml(profileSummary)}<button class="secondaryBtn logoutBtn" onclick="signOutAccount()">Log Out</button>`;
    },
    edit() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">EDIT PROFILE</div><div class="card accountCard"><div class="profileMark smallAvatar">${profileAvatar()}</div><label class="fieldLabel">Profile photo</label><input class="field" type="file" accept="image/*" onchange="handleAvatarFile(this)"><label class="fieldLabel">Display name</label><div class="adminMini"><input class="field" id="displayNameField" value="${esc(accountPrefs.display_name||"")}" maxlength="32" placeholder="Display name"><button class="secondaryBtn" onclick="saveDisplayName()">Save</button></div><label class="fieldLabel">Anonymous mode</label><div class="identityToggle"><button class="${mode==="anonymous"?"on":""}" onclick="setInteractionVisibility('anonymous')">Anonymous</button><button class="${mode==="public"?"on":""}" onclick="setInteractionVisibility('public')">Public</button></div><p class="rewardFine">Anonymous Mode: When enabled, your public posts and reports show as “Anonymous User.” LineUp can still link activity to your account for moderation and safety.</p></div>`;
    },
    favorites() {
      const bars = activeBars();
      const saved = favs.map((id) => bars.find((bar) => bar.id === id)).filter(Boolean);
      const savedHtml = saved.length ? '<div class="favSetup allFavs">' + saved.map((bar) => `<button class="on" onclick="toggleFav('${bar.id}')">${esc(bar.name)}</button>`).join("") + '</div>' : '<div class="emptyState"><b>No favorites yet</b><p>Tap the star on a venue card to save it here and pin it near the top of Live.</p></div>';
      const browseHtml = bars.filter((bar) => !isFav(bar.id)).map((bar) => `<button onclick="toggleFav('${bar.id}')">${esc(bar.name)}</button>`).join("");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">FAVORITES</div><div class="card"><b>Your Favorite Bars</b><p class="muted intelCopy">Favorites are saved to your account and hydrate from the current live venue list.</p>${savedHtml}</div><div class="card"><b>Add another spot</b><p class="muted intelCopy">Only active venues appear here, so old or missing favorites are ignored gracefully.</p><div class="favSetup allFavs">${browseHtml || '<span class="muted">Every active venue is already saved.</span>'}</div></div>`;
    },
    preferences() {
      const pc = presenceCopy(), n = prefStatus("notification"), l = prefStatus("location");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">PREFERENCES</div><div class="card permission"><b>Campus</b><p class="muted intelCopy">University of Arizona is selected for Early Access. Campus selection works without location permission.</p><div class="rewardRule"><b>Selected campus</b><span>University of Arizona</span></div></div><div class="card permission"><b>Notifications</b><p class="muted intelCopy">Get future alerts when saved venues publish updates or Early Access expands.</p><div class="rewardRule"><b>Status</b><span>${esc(cap(n))}</span></div><button class="submit" onclick="requestNotifications()">Enable Notifications</button></div><div class="card permission"><b>Location</b><p class="muted intelCopy">Use location to show nearby venues and improve aggregate crowd accuracy while LineUp is open. You can keep browsing by campus without it.</p><div class="locationStatus"><b>${esc(pc.title)}</b><span>${esc(pc.detail)}</span></div><div class="rewardRule"><b>Preference</b><span>${esc(cap(l))}</span></div><button class="submit" onclick="requestSetupLocation()">${presenceState?"Refresh Location":"Use Location"}</button></div>`;
    },
    rewards() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button>${renderRewardsHtml({rewardViewState})}<details class="card photoPanel" open><summary>How to Earn <span class="muted">Open</span></summary><p class="muted intelCopy">Submit accurate crowd and line reports, check in near venues, flag outdated information, and use LineUp consistently.</p></details><details class="card photoPanel"><summary>What Rewards Can Be Used For <span class="muted">Open</span></summary><p class="muted intelCopy">Redeem a full points balance for a LineUp Skip when the reward is available.</p></details><details class="card photoPanel"><summary>Rules <span class="muted">Open</span></summary><p class="muted intelCopy">Points are server-backed, capped per night, and tied to verified account activity. Fake or spammy reports can lose trust or rewards.</p></details>`;
    },
    privacy() {
      const copy = legalCopy("privacy");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">PRIVACY & DATA</div><div class="card"><b>${copy.title}</b><div class="legalCopy">${legalSections(copy)}</div><a class="secondaryBtn legalLink" href="/legal/privacy.html" target="_blank" rel="noopener">Open Privacy Policy</a></div>`;
    },
    terms() {
      const copy = legalCopy("terms");
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">TERMS</div><div class="card"><b>${copy.title}</b><div class="legalCopy">${legalSections(copy)}</div><a class="secondaryBtn legalLink" href="/legal/terms.html" target="_blank" rel="noopener">Open Terms of Use</a></div>`;
    },
    help() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">HELP</div><div class="card"><b>Support</b><p class="muted intelCopy">Contact LineUp for bugs, venue corrections, privacy questions, or account help. Do not include passwords or precise location in a support message.</p><a class="submit legalLink" href="mailto:support@get-lineup.app?subject=LineUp%20Support">Email support@get-lineup.app</a><a class="secondaryBtn legalLink" href="https://github.com/hunterbice/LineUp/issues" target="_blank" rel="noopener">Report a bug</a></div><div class="card"><b>Venue and owner help</b><p class="muted intelCopy">Venue operators can contact support to request a correction or discuss authorized staff access. Student accounts cannot assign venue roles.</p></div>`;
    },
    account() {
      return `<button class="backBtn" onclick="profileBack()">${svg.back} Profile</button><div class="sectionlabel">ACCOUNT & ACCESS</div><div class="card"><b>Signed-in account</b><p class="muted intelCopy">${esc(authState&&authState.email||"LineUp account")}</p><button class="secondaryBtn" onclick="signOutAccount()">Log Out</button></div><div class="card dangerCard"><b>Delete account</b><p class="muted intelCopy">Deletion removes your profile, favorites, saved devices, precise presence and check-in history, rewards, launch-deal requests, and reports. Non-identifying aggregate venue statistics may remain.</p><button class="dangerBtn" onclick="openDeleteAccountConfirmation()">Delete My Account</button><p class="rewardFine">This action cannot be undone.</p></div>`;
    }
  };
  return (views[view] || views.home)();
}
