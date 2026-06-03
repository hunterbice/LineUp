import { esc } from "../utils/dom.js";

export function mapShellHtml() {
  return '<div class="sectionlabel">LIVE MAP</div><div class="mapbox real" id="mapBox"><div class="mapSetup"><div class="mapSetupCard"><b>Loading real map</b><p class="muted">LineUp is preparing Tucson venue pins.</p></div></div></div><div class="card" style="margin-top:14px"><b>Map accuracy</b><p class="muted intelCopy">Pins use stored venue coordinates. Directions open the user’s preferred maps app.</p></div>';
}

export function mapUnavailableHtml() {
  return '<div class="card" style="margin-top:14px"><b>Live map unavailable</b><p class="muted intelCopy">Saved venue pins are still available. Directions continue to open from each venue page.</p></div>';
}

export function mapPoint(coords) {
  const minLat=32.2205,maxLat=32.2370,minLng=-110.9710,maxLng=-110.9440;
  return { x:9+((coords.lng-minLng)/(maxLng-minLng))*82, y:10+((maxLat-coords.lat)/(maxLat-minLat))*78 };
}

export function fallbackMapHtml({ bars, userCoords, colors }) {
  const mainGate = mapPoint({lat:userCoords[1],lng:userCoords[0]});
  const roads = '<div class="maproad" style="left:24%;top:26%">University Blvd</div><div class="maproad" style="left:70%;top:15%">Speedway Blvd</div><div class="maproad" style="left:29%;top:52%;transform:rotate(-72deg)">4th Ave</div><div class="maproad" style="left:24%;top:74%">Congress St</div>';
  const pins = bars.map((bar) => {
    const point = mapPoint(bar.coords);
    const short = bar.name.replace(" Bar & Grill","").replace(" Bar + Food","").split(" ")[0];
    return `<button class="pin" aria-label="${esc(bar.name)}" onclick="trackAppEvent('${bar.id}','map_pin_tap',{map:'fallback'});openDetail('${bar.id}')" style="left:${point.x}%;top:${point.y}%;background:${colors[bar.lvl]}"><span></span></button><div class="maplabel" style="left:${point.x+3}%;top:${point.y+5}%">${esc(short)}</div>`;
  }).join("");
  return '<div class="mapcanvas" id="mapCanvas">'+roads+'<div class="geofence" style="left:'+mainGate.x+'%;top:'+mainGate.y+'%"></div>'+pins+'</div><div class="maphint">Map temporarily unavailable · showing saved venue pins</div>';
}

export function circlePolygon(center,radiusMeters,points) {
  const coords=[],lat=center[1],lng=center[0],earth=6371008.8,dist=radiusMeters/earth,latRad=lat*Math.PI/180,lngRad=lng*Math.PI/180;
  for(let i=0;i<=points;i++){const brng=i*2*Math.PI/points,lat2=Math.asin(Math.sin(latRad)*Math.cos(dist)+Math.cos(latRad)*Math.sin(dist)*Math.cos(brng)),lng2=lngRad+Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(latRad),Math.cos(dist)-Math.sin(latRad)*Math.sin(lat2));coords.push([lng2*180/Math.PI,lat2*180/Math.PI])}
  return { type:"Feature", geometry:{ type:"Polygon", coordinates:[coords] } };
}

export function createVenueMarker({ mapboxgl, map, bar, level, escHtml, onTap }) {
  const el = document.createElement("button");
  el.className = "mapMarker "+bar.lvl;
  el.type = "button";
  el.setAttribute("aria-label", bar.name);
  el.onclick = onTap;
  const popup = new mapboxgl.Popup({offset:28,closeButton:false}).setHTML("<b>"+escHtml(bar.name)+"</b><br><span style='color:#B8BDC8'>"+(bar.wait?bar.wait+" min line":"No line")+" · "+level(bar).label+"</span>");
  return new mapboxgl.Marker({element:el,anchor:"bottom"}).setLngLat([bar.coords.lng,bar.coords.lat]).setPopup(popup).addTo(map);
}
