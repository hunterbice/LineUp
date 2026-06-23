import { esc } from "../utils/dom.js";

function dealTypeLabel(type) {
  return {
    deal: "Deal",
    event: "Event",
    cover: "Cover",
    happy_hour: "Happy hour",
    special: "Special",
  }[type] || "Deal";
}

function timeLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dealStatus(row) {
  if (!row) return "";
  const now = Date.now();
  const startsAt = Date.parse(row.startsAt || "");
  const endsAt = Date.parse(row.endsAt || "");
  if (row.isActive === false) return "Inactive";
  if (Number.isFinite(endsAt) && endsAt <= now) return "Expired";
  if (Number.isFinite(startsAt) && startsAt > now) return "Scheduled";
  return "Active";
}

function numberLabel(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function metric(label, value) {
  const display = typeof value === "string" ? value : numberLabel(value);
  return '<div class="dealPerfMetric"><b>' + esc(display) + '</b><span>' + esc(label) + '</span></div>';
}

function performanceEmptyCopy(state) {
  if (state && state.loading) return "Loading deal performance...";
  if (state && state.error) return state.error;
  return "Post tonight's deal to start tracking student interest.";
}

function localDateTime(value, offsetHours) {
  const date = value ? new Date(value) : new Date(Date.now() + (offsetHours || 0) * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

export function renderDealBadge(deal) {
  if (!deal) return "";
  const label = dealTypeLabel(deal.dealType);
  return '<div class="dealBadge"><b>' + esc(label) + ':</b> ' + esc(deal.title) + '</div>';
}

export function renderVenueDealBlock(deals) {
  const rows = (Array.isArray(deals) ? deals : []).slice(0, 2);
  if (!rows.length) return "";
  return '<section class="dealBlock" id="activeDealSection" data-testid="active-deal-section" tabindex="-1"><div class="sectionlabel">ACTIVE DEAL</div>' + rows.map(function(deal) {
    return '<div class="dealDetailCard">' +
      '<div><b>' + esc(deal.title) + '</b>' +
      (deal.description ? '<p>' + esc(deal.description) + '</p>' : '') +
      '<span>Venue posted · ends ' + esc(timeLabel(deal.endsAt)) + '</span></div>' +
      (deal.isPromoted ? '<em>Promoted</em>' : '') +
      '</div>';
  }).join("") + '</section>';
}

export function renderDealEditor({ bar, deal, subscription, prefix, isOwner }) {
  if (!bar) return "";
  const sub = subscription || { plan: "free", status: "active" };
  const canPromote = isOwner || sub.plan === "boost" || sub.plan === "premier";
  const canPost = isOwner || sub.plan === "pro" || sub.plan === "boost" || sub.plan === "premier";
  return '<div class="dealEditor">' +
    '<div class="sectionlabel">TONIGHT DEAL</div>' +
    '<input type="hidden" id="' + prefix + 'DealId" value="' + esc(deal && deal.id || "") + '">' +
    '<div class="dealPlan"><b>Post tonight\'s deal or event</b><span>' + (canPost ? 'Students see it while choosing where to go.' : 'Deal posting is not enabled for this venue yet.') + '</span></div>' +
    (!deal ? '<div class="dealTips"><b>Post tonight\'s deal to start tracking student interest.</b><span>Add a short title, set start/end time, keep it specific, and update it before peak hours.</span></div>' : '') +
    '<label class="fieldLabel">Title</label><input class="field" id="' + prefix + 'DealTitle" value="' + esc(deal && deal.title || "") + '" maxlength="80" placeholder="No cover before 10">' +
    '<div class="dealExamples">Examples: No cover before 10 · $3 wells tonight · DJ starts at 10:30 · Game day special</div>' +
    '<label class="fieldLabel">Description</label><textarea class="field" id="' + prefix + 'DealDescription" maxlength="240" placeholder="Keep it short — students are deciding fast.">' + esc(deal && deal.description || "") + '</textarea>' +
    '<div class="adminMini"><select class="field" id="' + prefix + 'DealType">' +
      ["deal", "event", "cover", "happy_hour", "special"].map(function(type) { return '<option value="' + type + '" ' + (deal && deal.dealType === type ? "selected" : "") + '>' + esc(dealTypeLabel(type)) + '</option>'; }).join("") +
    '</select><select class="field" id="' + prefix + 'DealTier" ' + (!canPromote ? "disabled" : "") + '>' +
      ["standard", "boost", "premier"].map(function(tier) { return '<option value="' + tier + '" ' + (deal && deal.promotionTier === tier ? "selected" : "") + '>' + esc(tier.charAt(0).toUpperCase() + tier.slice(1)) + '</option>'; }).join("") +
    '</select></div>' +
    '<div class="adminMini"><input class="field" id="' + prefix + 'DealStarts" type="datetime-local" value="' + esc(localDateTime(deal && deal.startsAt, 0)) + '"><input class="field" id="' + prefix + 'DealEnds" type="datetime-local" value="' + esc(localDateTime(deal && deal.endsAt, 4)) + '"></div>' +
    '<label class="toggleLine"><input id="' + prefix + 'DealActive" type="checkbox" ' + (!deal || deal.isActive ? "checked" : "") + '> Active tonight</label>' +
    '<label class="toggleLine ' + (!canPromote ? "disabled" : "") + '"><input id="' + prefix + 'DealPromoted" type="checkbox" ' + (deal && deal.isPromoted ? "checked" : "") + ' ' + (!canPromote ? "disabled" : "") + '> Promoted placement</label>' +
    '<div class="sheetActions"><button class="submit" onclick="saveVenueDeal(&quot;' + esc(bar.id) + '&quot;,&quot;' + esc(prefix) + '&quot;)" ' + (!canPost && !isOwner ? "disabled" : "") + '>Save Deal</button>' +
    (deal ? '<button class="secondaryBtn" onclick="deactivateVenueDeal(&quot;' + esc(deal.id) + '&quot;)">Deactivate</button>' : '') + '</div>' +
    '<p class="rewardFine">Promoted deals can increase visibility, but crowd level, wait time, and confidence stay based on live status and reports.</p>' +
    '</div>';
}

export function renderDealPerformance({ rows, loading, error }) {
  rows = Array.isArray(rows) ? rows : [];
  if (loading) {
    return '<div class="dealPerformance"><div class="sectionlabel">DEAL PERFORMANCE</div><div class="dealPerfCard" aria-label="Loading deal performance"><span class="skeletonLine medium"></span><div class="dealPerfGrid"><span class="skeletonButton"></span><span class="skeletonButton"></span><span class="skeletonButton"></span><span class="skeletonButton"></span></div></div></div>';
  }
  if (loading || error || !rows.length) {
    return '<div class="dealPerformance">' +
      '<div class="sectionlabel">DEAL PERFORMANCE</div>' +
      '<div class="dealPerfEmpty"><b>Track views, taps, and venue opens</b><p>' + esc(performanceEmptyCopy({ loading, error })) + '</p></div>' +
      '</div>';
  }
  return '<div class="dealPerformance">' +
    '<div class="sectionlabel">DEAL PERFORMANCE</div>' +
    rows.slice(0, 3).map(function(row) {
      const reportActions = Number(row.reportOpensToday || 0) + Number(row.reportSubmitsToday || 0);
      const noViews = Number(row.impressionsToday || 0) === 0 && Number(row.impressions7d || 0) === 0;
      return '<div class="dealPerfCard">' +
        '<div class="dealPerfTop"><div><b>' + esc(row.dealTitle || "Venue deal") + '</b><span>' + esc(dealStatus(row)) + ' · Ends ' + esc(timeLabel(row.endsAt) || "soon") + '</span></div>' +
        '<em>' + esc(row.isPromoted ? "Promoted" : "Standard") + '</em></div>' +
        (noViews ? '<p class="dealPerfNote">This deal is live, but it has not received views yet.</p>' : '') +
        '<div class="dealPerfGroup"><span>Today</span><div class="dealPerfGrid">' +
          metric("Views", row.impressionsToday) +
          metric("Taps", row.tapsToday) +
          metric("Venue opens", row.detailOpensToday) +
          metric("Report actions", reportActions) +
        '</div></div>' +
        '<div class="dealPerfGroup"><span>Last 7 days</span><div class="dealPerfGrid">' +
          metric("Views", row.impressions7d) +
          metric("Taps", row.taps7d) +
          metric("Venue opens", row.detailOpens7d) +
          metric("Tap rate", (Number(row.tapRate7d || 0)).toFixed(1) + "%") +
        '</div></div>' +
      '</div>';
    }).join("") +
    '<p class="rewardFine">Performance shows student interest in the deal. Live status stays separate from paid promotions.</p>' +
    '</div>';
}

export const dealRenderTestHooks = { localDateTime, timeLabel, dealStatus, performanceEmptyCopy };
