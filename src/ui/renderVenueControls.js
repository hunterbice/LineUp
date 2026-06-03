import { esc } from "../utils/dom.js";

export function renderVenueControlsForBar({ ids, bar, levels, logo, level, venueControl }) {
  ids = Array.isArray(ids) ? ids : [];
  if (!bar) return noVenueRoleHtml();
  levels = levels || {};
  const selectHtml = ids.length>1 ? venueControl : `<div class="lockNote">Venue access: ${esc(bar.name)} only</div>`;
  return `<div class="ownerHeader"><div><div class="sectionlabel">VENUE CONTROLS</div><h2>Staff Live Console</h2></div></div><div class="card"><p class="sheetIntro">Update crowd, line wait, cover, and event notes for venues assigned to your signed-in account. Staff signals carry high trust only after Supabase accepts the update.</p><div class="adminVenueHeader">${logo(bar)}<div><b>${esc(bar.name)}</b><span>${esc(bar.address)}</span><span>Current read: ${level(bar).label} · ${bar.wait?bar.wait+" min":"No line"}</span></div></div>${selectHtml}<label class="fieldLabel">Crowd</label><div class="choicegrid">${Object.keys(levels).map(k=>`<button class="${bar.lvl===k?"on":""}" onclick="adminPatch('${bar.id}',{lvl:'${k}'})">${levels[k].label}</button>`).join("")}</div><label class="fieldLabel">Line + cover</label><div class="adminMini"><input class="field" id="adminWait" type="number" min="0" max="180" value="${bar.wait||0}" placeholder="Wait min"><select class="field" id="adminCover"><option value="">No cover</option><option value="$5">$5</option><option value="$10">$10</option><option value="$15">$15</option><option value="$20">$20</option></select></div><label class="fieldLabel">Event</label><input class="field" id="adminEvent" value="${esc(bar.event||"")}" placeholder="Tonight's event"><div class="adminRows"><div class="adminRow"><div><b>Publish venue update</b><small>Writes to Supabase first, then refreshes the confirmed live read.</small></div><button onclick="applyAdminFields('${bar.id}')">Publish</button></div></div></div>`;
}

export function noVenueRoleHtml() {
  return '<div class="sectionlabel">VENUE CONTROLS</div><div class="card"><b>No venue role found</b><p class="muted intelCopy">This account does not have owner or venue staff access.</p></div>';
}
