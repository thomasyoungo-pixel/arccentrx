// Path-based "coming soon" gate.
//
// - Public site (arccentrx.com / www) shows /coming-soon.html for every URL.
// - Visiting /preview unlocks the full site: it sets a preview cookie and
//   serves the real home page at that URL. With the cookie set, every page is
//   browsable normally, so the team can click straight through the whole site.
//   Share www.arccentrx.com/preview as the internal preview link.
// - Visiting /lock clears the cookie and returns that browser to the holding
//   page (handy for checking what the public sees).
//
// The cookie is per-browser: unlocking your own browser does not change what
// anyone else sees. To LAUNCH publicly, delete this file and the matching
// [[edge_functions]] block in netlify.toml, then push. Nothing else changes.

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const cookie = request.headers.get("cookie") || "";
  const unlocked = cookie.includes("ax_preview=1");

  // Secret unlock link -> grant preview access, then show the real home page.
  if (path === "/preview" || path === "/preview/") {
    const response = await context.rewrite(new URL("/index.html", request.url));
    response.headers.append(
      "Set-Cookie",
      "ax_preview=1; Path=/; Max-Age=31536000; SameSite=Lax"
    );
    return response;
  }

  // Escape hatch -> clear the cookie and show the holding page.
  if (path === "/lock" || path === "/lock/") {
    const response = await context.rewrite(
      new URL("/coming-soon.html", request.url)
    );
    response.headers.append(
      "Set-Cookie",
      "ax_preview=; Path=/; Max-Age=0; SameSite=Lax"
    );
    return response;
  }

  // Already unlocked -> serve the real site untouched.
  if (unlocked) {
    return;
  }

  // Locked -> holding page for everything (guard against a rewrite loop).
  if (path === "/coming-soon.html") {
    return;
  }
  return context.rewrite(new URL("/coming-soon.html", request.url));
};
