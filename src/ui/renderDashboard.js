import { esc } from "../utils/dom.js";

export function renderBarCard(bar, helpers) {
  const level = helpers.level(bar);
  const close = helpers.closeText(bar);
  const fav = helpers.isFavorite(bar.id);
  const signal = helpers.signalState(bar);
  const confirmed = bar.backend ? "Live source" : "Typical read";
  const action = bar.wait > 20 ? "Check before you go" : bar.lvl === "packed" ? "Expect a crowd" : bar.lvl === "busy" ? "Good energy now" : "Easy move";
  const dealBadge = helpers.renderDealBadge ? helpers.renderDealBadge(helpers.deal || null) : "";
  return '<article class="barcard" data-id="' + bar.id + '"><div class="cardtop">' +
    helpers.logo(bar) +
    '<div class="grow"><div class="name">' + esc(bar.name) + '</div><div class="tag">' + esc(bar.tag) + '</div><div class="close ' +
    (close.indexOf("Closing") === 0 ? "closing" : close.indexOf("Closed") === 0 ? "closed" : "") + '">' + esc(close) + '</div></div><button class="fav ' +
    (fav ? "on" : "") + '" data-fav="' + bar.id + '" aria-label="Favorite ' + esc(bar.name) + '">' + (fav ? helpers.svg.starFull : helpers.svg.starEmpty) + '</button></div><div class="statusline"><span class="statuspill" style="color:' +
    helpers.colors[bar.lvl] + '">' + level.label + '</span><span>' + esc(confirmed) + '</span><span>' + esc(signal.detail) + '</span></div>' + dealBadge + '<div class="statgrid"><div><div class="bigstat" style="color:' +
    helpers.colors[bar.lvl] + '">' + level.label + '</div><span class="smallcap">' + esc(bar.momentum.replace("_", " ")) + '</span></div><div class="right"><div class="bigstat">' +
    (bar.wait ? bar.wait + " min" : "No line") + '</div><span class="smallcap">est. line</span></div></div><div class="range"><em>Likely</em> ' +
    level.range + '</div><div class="energy"><div style="width:' + level.pct + '%;background:' + helpers.colors[bar.lvl] + ';color:' +
    helpers.colors[bar.lvl] + '"></div></div><div class="conf"><span class="dot" style="background:' + helpers.confColor(signal.tone) + ';color:' +
    helpers.confColor(signal.tone) + '"></span>' + esc(signal.label) + ' <span class="updated">' + esc(action) + '</span></div><div class="cardActions"><button class="cardAction primary" data-id="' + bar.id + '">Details</button><button class="cardAction quickReport" data-report="' + bar.id + '">Report</button></div></article>';
}

export function renderLiveDashboard({ list, renderBar }) {
  return renderRetentionDashboard({ list, favorites: [], recents: [], renderBar });
}

export function renderRetentionDashboard({ list, favorites, recents, renderBar, loading, earlyAccess }) {
  const all = Array.isArray(list) ? list : [];
  const favoriteList = Array.isArray(favorites) ? favorites : [];
  const recentList = (Array.isArray(recents) ? recents : []).filter((bar) => !favoriteList.some((fav) => fav.id === bar.id));
  const featuredIds = new Set(favoriteList.concat(recentList).map((bar) => bar.id));
  const remaining = all.filter((bar) => !featuredIds.has(bar.id));
  const cards = loading && !all.length ? renderDashboardSkeleton() : all.length ? [
    renderSection("Your spots", favoriteList, renderBar, '<div class="emptyState retentionPrompt"><b>No favorite spots yet</b><p>Tap the star on a spot to pin it here for faster checks later.</p></div>'),
    renderSection("Recently checked", recentList, renderBar, ""),
    renderSection("All nearby spots", remaining.length ? remaining : all, renderBar, ""),
  ].join("") : '<div class="emptyState"><b>No venues loaded yet</b><p>LineUp is waiting on the live venue feed. Try refreshing in a moment.</p><button onclick="location.reload()">Refresh</button></div>';
  const earlyAccessHtml = earlyAccess ? `<section class="earlyAccessBanner"><span class="earlyAccessPill">ARIZONA FALL EARLY ACCESS</span><h2>Build your fall lineup.</h2><p>Save favorite spots and request launch deals now. Venue cards show backend-confirmed updates when available and clearly labeled typical patterns when recent data is limited.</p></section>` : "";
  return earlyAccessHtml + `<div class="dashboardIntro"><h2>Where are you going tonight?</h2><p>Check the scene before you head out.</p></div>` + cards;
}

function renderDashboardSkeleton() {
  return '<div class="skeletonGrid" aria-label="Loading live venues">' + Array.from({ length: 3 }, function() {
    return '<div class="barcard barcardSkeleton" aria-hidden="true"><div class="skeletonCardTop"><span class="skeletonAvatar"></span><div><span class="skeletonLine title"></span><span class="skeletonLine medium"></span></div></div><span class="skeletonLine"></span><span class="skeletonLine short"></span><span class="skeletonButton"></span></div>';
  }).join("") + '</div>';
}

function renderSection(title, bars, renderBar, emptyHtml) {
  if (!bars.length) return emptyHtml || "";
  return '<div class="sectionlabel">' + esc(title) + '</div>' + bars.map(renderBar).join("");
}
