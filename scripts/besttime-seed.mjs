import { readFile, mkdir, writeFile } from "node:fs/promises";

const privateKey = process.env.BESTTIME_PRIVATE_KEY;
const publicKey = process.env.BESTTIME_PUBLIC_KEY || "";

if (!privateKey || !privateKey.startsWith("pri_")) {
  console.error("Set BESTTIME_PRIVATE_KEY before running this script.");
  process.exit(1);
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const venuePattern = /\{id:"([^"]+)".*?status:"active".*?name:"([^"]+)".*?address:"([^"]+)"/gs;
const venues = [...html.matchAll(venuePattern)].map((match) => ({
  id: match[1],
  name: decodeEntities(match[2]),
  address: decodeEntities(match[3]),
}));

const results = {};

for (const venue of venues) {
  const params = new URLSearchParams({
    api_key_private: privateKey,
    venue_name: venue.name,
    venue_address: venue.address,
  });

  try {
    const response = await fetch(`https://besttime.app/api/v1/forecasts?${params}`, {
      method: "POST",
    });
    const data = await response.json();
    const info = data.venue_info || {};
    results[venue.id] = {
      status: data.status || "UNKNOWN",
      venueId: info.venue_id || null,
      venueName: info.venue_name || venue.name,
      address: venue.address,
      message: data.message || null,
    };
    console.log(`${venue.id}: ${results[venue.id].status}${results[venue.id].venueId ? " " + results[venue.id].venueId : ""}`);
  } catch (error) {
    results[venue.id] = {
      status: "ERROR",
      venueId: null,
      venueName: venue.name,
      address: venue.address,
      message: error.message,
    };
    console.error(`${venue.id}: ${error.message}`);
  }
}

await mkdir(new URL("../data", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/besttime-venues.json", import.meta.url),
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      publicKey,
      venues: results,
    },
    null,
    2
  ) + "\n"
);

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&rsquo;", "’");
}
