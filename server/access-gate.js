const parseCookies = (header) => {
  const raw = typeof header === "string" ? header : "";
  if (!raw.trim()) return {};
  const out = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
};

function createAccessGate(options) {
  const token = String(options?.token ?? "").trim();
  const cookieName = String(options?.cookieName ?? "studio_access").trim() || "studio_access";

  const enabled = Boolean(token);

  const isAuthorized = (req) => {
    if (!enabled) return true;
    const cookieHeader = req.headers?.cookie;
    const cookies = parseCookies(cookieHeader);
    return cookies[cookieName] === token;
  };

  const handleHttp = (req, res) => {
    if (!enabled) return false;

    // Allow access via ?token=xxx query param — sets cookie and redirects
    const url = String(req.url || "/");
    const queryIdx = url.indexOf("?");
    if (queryIdx !== -1) {
      const params = new URLSearchParams(url.slice(queryIdx + 1));
      const queryToken = params.get("token");
      if (queryToken === token) {
        const cleanPath = url.slice(0, queryIdx) || "/";
        res.statusCode = 302;
        res.setHeader("Set-Cookie", `${cookieName}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
        res.setHeader("Location", cleanPath);
        res.end();
        return true;
      }
    }

    if (!isAuthorized(req)) {
      if (url.startsWith("/api/")) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Studio access token required. Send the configured Studio access cookie and retry.",
          })
        );
      } else {
        res.statusCode = 401;
        res.setHeader("Content-Type", "text/plain");
        res.end("Studio access token required. Set the studio_access cookie to access this page.");
      }
      return true;
    }
    return false;
  };

  const allowUpgrade = (req) => {
    if (!enabled) return true;
    return isAuthorized(req);
  };

  return { enabled, handleHttp, allowUpgrade };
}

module.exports = { createAccessGate };

