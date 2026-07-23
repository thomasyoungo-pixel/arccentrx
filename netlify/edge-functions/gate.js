// Host-based "coming soon" gate.
//
// - Public domain (arccentrx.com / www) -> always shows /coming-soon.html
// - Internal subdomain (hi.arccentrx.com) -> serves the full site untouched,
//   so the team can keep building.
//
// To LAUNCH the real site publicly, just delete this file and the matching
// [[edge_functions]] block in netlify.toml, then push. Nothing else changes.

export default async (request, context) => {
  const host = (request.headers.get("host") || "").toLowerCase();

  // Internal staging host -> pass through to the real, full site.
  if (host.startsWith("hi.")) {
    return;
  }

  // Public host -> serve the holding page for every path.
  const url = new URL(request.url);
  if (url.pathname === "/coming-soon.html") {
    return; // serve the holding page itself (no rewrite loop)
  }
  return context.rewrite(new URL("/coming-soon.html", request.url));
};
