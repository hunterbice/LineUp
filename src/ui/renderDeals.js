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
  return '<div class="dealBlock"><div class="sectionlabel">TONIGHT HERE</div>' + rows.map(function(deal) {
    return '<div class="dealDetailCard">' +
      '<div><b>' + esc(deal.title) + '</b>' +
      (deal.description ? '<p>' + esc(deal.description) + '</p>' : '') +
      '<span>Venue posted · ends ' + esc(timeLabel(deal.endsAt)) + '</span></div>' +
      (deal.isPromoted ? '<em>Promoted</em>' : '') +
      '</div>';
  }).join("") + '</div>';
}

export function renderDealSection({ deals, venuesById, signalState }) {
  const list = Array.isArray(deals) ? deals : [];
  if (!list.length) return "";
  return '<div class="sectionlabel">TONIGHT’S DEALS</div><div class="dealIntro">Specials and events while you’re deciding where to go.</div>' +
    list.map(function(deal) {
      const venue = venuesById && venuesById[deal.venueId];
      if (!venue) return "";
      const signal = signalState ? signalState(venue) : { label: "Live source", detail: "" };
      return '<article class="dealCard" data-deal-id="' + esc(deal.id) + '" data-deal-venue="' + esc(deal.venueId) + '">' +
        '<div class="dealCardTop"><span>' + esc(dealTypeLabel(deal.dealType)) + '</span>' +
        (deal.isPromoted ? '<em>Promoted</em>' : '') + '</div>' +
        '<h3>' + esc(deal.title) + '</h3>' +
        '<p>' + esc(deal.description || venue.name) + '</p>' +
        '<div class="dealMeta"><b>' + esc(venue.name) + '</b><span>Ends ' + esc(timeLabel(deal.endsAt)) + '</span></div>' +
        '<div class="dealTrust">' + esc(signal.label) + ' · ' + esc(signal.detail) + '</div>' +
        '<button class="cardAction primary" data-deal-open="' + esc(deal.id) + '">Details</button>' +
      '</article>';
    }).join("");
}

export function renderDealEditor({ bar, deal, subscription, prefix, isOwner }) {
  if (!bar) return "";
  const sub = subscription || { plan: "free", status: "active" };
  const canPromote = isOwner || sub.plan === "boost" || sub.plan === "premier";
  const canPost = isOwner || sub.plan === "pro" || sub.plan === "boost" || sub.plan === "premier";
  return '<div class="dealEditor">' +
    '<div class="sectionlabel">TONIGHT DEAL</div>' +
    '<input type="hidden" id="' + prefix + 'DealId" value="' + esc(deal && deal.id || "") + '">' +
    '<div class="dealPlan"><b>' + esc((sub.plan || "free").toUpperCase()) + ' plan</b><span>' + (canPost ? 'Deal posting enabled.' : 'Upgrade plan required for staff-posted deals.') + '</span></div>' +
    '<label class="fieldLabel">Title</label><input class="field" id="' + prefix + 'DealTitle" value="' + esc(deal && deal.title || "") + '" maxlength="80" placeholder="No cover before 10">' +
    '<label class="fieldLabel">Description</label><textarea class="field" id="' + prefix + 'DealDescription" maxlength="240" placeholder="Short detail students can scan fast">' + esc(deal && deal.description || "") + '</textarea>' +
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
    '<p class="rewardFine">Deals are venue-posted marketing. They never change crowd level, wait time, or confidence scoring.</p>' +
    '</div>';
}

export const dealRenderTestHooks = { localDateTime, timeLabel };
