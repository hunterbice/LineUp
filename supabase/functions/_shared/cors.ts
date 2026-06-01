const allowedOrigins = new Set([
  "https://get-lineup.app",
  "https://www.get-lineup.app",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:4185",
  "http://127.0.0.1:4185",
]);

function isLocalDevOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (origin === "null") return true;
  return allowedOrigins.has(origin) || isLocalDevOrigin(origin);
}

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin");
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || "*") : "https://get-lineup.app";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function corsResponse(req: Request) {
  return new Response("ok", { headers: corsHeadersFor(req) });
}

export function jsonResponse(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(req ? corsHeadersFor(req) : corsHeaders),
      "Content-Type": "application/json",
    },
  });
}
