import { esc } from "../utils/dom.js";

export function renderBarCard(bar, helpers) {
  const level = helpers.level(bar);
  const close = helpers.closeText(bar);
  const fav = helpers.isFavorite(bar.id);
  const signal = helpers.signalState(bar);
  const confirmed = bar.backend ? "Live source" : "Typical read";
  const action = bar.wait > 20 ? "Check before you go" : bar.lvl === "packed" ? "Expect a crowd" : bar.lvl === "busy" ? "Good energy now" : "Easy move";
  return '<article class="barcard" data-id="' + bar.id + '"><div class="cardtop">' +
    helpers.logo(bar) +
    '<div class="grow"><div class="name">' + esc(bar.name) + '</div><div class="tag">' + esc(bar.tag) + '</div><div class="close ' +
    (close.indexOf("Closing") === 0 ? "closing" : close.indexOf("Closed") === 0 ? "closed" : "") + '">' + esc(close) + '</div></div><button class="fav ' +
    (fav ? "on" : "") + '" data-fav="' + bar.id + '" aria-label="Favorite ' + esc(bar.name) + '">' + (fav ? helpers.svg.starFull : helpers.svg.starEmpty) + '</button></div><div class="statusline"><span class="statuspill" style="color:' +
    helpers.colors[bar.lvl] + '">' + level.label + '</span><span>' + esc(confirmed) + '</span><span>' + esc(signal.detail) + '</span></div><div class="statgrid"><div><div class="bigstat" style="color:' +
    helpers.colors[bar.lvl] + '">' + level.label + '</div><span class="smallcap">' + esc(bar.momentum.replace("_", " ")) + '</span></div><div class="right"><div class="bigstat">' +
    (bar.wait ? bar.wait + " min" : "No line") + '</div><span class="smallcap">est. line</span></div></div><div class="range"><em>Likely</em> ' +
    level.range + '</div><div class="energy"><div style="width:' + level.pct + '%;background:' + helpers.colors[bar.lvl] + ';color:' +
    helpers.colors[bar.lvl] + '"></div></div><div class="conf"><span class="dot" style="background:' + helpers.confColor(signal.tone) + ';color:' +
    helpers.confColor(signal.tone) + '"></span>' + esc(signal.label) + ' <span class="updated">' + esc(action) + '</span></div><div class="cardActions"><button class="cardAction primary" data-id="' + bar.id + '">Details</button><button class="cardAction quickReport" data-report="' + bar.id + '">Report</button></div></article>';
}

export function areaPulseCopy({ list, area, areaName, isFavorite }) {
  const packed = list.filter((bar) => bar.lvl === "packed").length;
  const busy = list.filter((bar) => bar.lvl === "busy").length;
  const active = busy + packed;
  const favoriteCount = list.filter((bar) => isFavorite(bar.id)).length;
  const lead = list.find((bar) => bar.lvl === "packed") || list.find((bar) => bar.lvl === "busy");
  const suffix = favoriteCount ? favoriteCount + " favorites pinned first" : "Pulse can plan the move";
  if ((packed >= 1 && active >= 2) || active >= 3) return { title: areaName(area) + " is heating up", meta: busy + " busy · " + packed + " packed · " + suffix };
  if (lead) return { title: lead.name + " is picking up", meta: areaName(area) + " has " + active + " active spot" + (active === 1 ? "" : "s") + " · " + suffix };
  return { title: areaName(area) + " is calm right now", meta: "No busy venues yet · " + suffix };
}

export function renderLiveDashboard({ list, pulse, svg, renderBar }) {
  const cards = list.length ? list.map(renderBar).join("") : '<div class="emptyState"><b>No venues loaded yet</b><p>LineUp is waiting on the live venue feed. Try refreshing in a moment.</p><button onclick="location.reload()">Refresh</button></div>';
  return `<div class="pulsecard" onclick="setPage('highlightsPage')"><div class="pulseicon">${svg.pulseTrend}</div><div><b>${esc(pulse.title)}</b><span>${esc(pulse.meta)}</span></div><div class="chev"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></div></div><div class="sectionlabel">LIVE BAR STATUS</div>` + cards;
}
