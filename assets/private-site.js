/* =========================================================================
   ArcCentrx Private — sub-site behavior
   A SEPARATE header + footer from the main ArcCentrx site. Private is its
   own institution: its own wordmark ("Private"), a persistent discreet
   "Private Access" action, and a full-screen editorial menu that indexes
   the sections. Loaded ONLY by the private-*.html pages (in place of
   site.js). Each page sets <body data-page="private-<key>"> so the active
   section is marked in the menu.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- Brand mark: the ArcCentrx arc-wordmark, reversed to white with a
          gold accent so it belongs to the Private tier. Built by recoloring
          the shared navy mark to avoid drift from the canonical artwork. ---- */
  var LOGO_NAVY =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 259 70" aria-hidden="true" focusable="false">' +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 60 L27 10 L50 60" stroke="#1B2A4A" stroke-width="8"/>' +
    '<path d="M9.52 48 A25.3 25.3 0 0 1 44.48 48" stroke="#1B2A4A" stroke-width="6"/></g>' +
    '<g fill="#1B2A4A"><g transform="translate(52.1200,64.0000) scale(0.081330,-0.081330)"><path d="M134 -7Q109 -7 95.5 7.0Q82 21 82 46V652Q82 678 96.0 691.5Q110 705 135 705H374Q488 705 550.0 651.0Q612 597 612 498Q612 434 584.0 388.0Q556 342 502.5 318.0Q449 294 374 294L383 308H409Q449 308 478.5 288.0Q508 268 532 224L618 64Q628 46 627.5 29.5Q627 13 615.5 3.0Q604 -7 583 -7Q561 -7 547.5 2.5Q534 12 523 31L418 225Q397 264 370.0 277.5Q343 291 299 291H186V46Q186 21 173.0 7.0Q160 -7 134 -7ZM186 369H357Q433 369 472.0 401.0Q511 433 511 496Q511 558 472.0 590.0Q433 622 357 622H186Z"/></g></g>' +
    '<g fill="#1B2A4A"><g transform="translate(103.3500,64.0000) scale(0.080090,-0.080090)"><path d="M398 -9Q291 -9 215.0 35.0Q139 79 98.5 160.5Q58 242 58 353Q58 436 81.0 502.5Q104 569 147.5 616.5Q191 664 254.5 689.0Q318 714 398 714Q457 714 511.5 698.0Q566 682 606 652Q623 641 628.5 625.5Q634 610 630.5 596.0Q627 582 617.0 572.5Q607 563 591.5 562.0Q576 561 558 573Q525 598 485.0 610.0Q445 622 401 622Q325 622 273.0 590.5Q221 559 194.0 499.0Q167 439 167 353Q167 267 194.0 206.5Q221 146 273.0 114.5Q325 83 401 83Q445 83 485.5 95.5Q526 108 562 133Q580 144 594.5 143.0Q609 142 619.0 133.0Q629 124 632.5 110.5Q636 97 631.5 82.5Q627 68 612 58Q571 25 515.0 8.0Q459 -9 398 -9Z"/></g></g>' +
    '<path d="M144.66 41.43 A10 10 0 1 1 144.66 28.57" fill="none" stroke="#1D9E75" stroke-width="5" stroke-linecap="round"/>' +
    '<g fill="#1B2A4A">' +
    '<g transform="translate(151.0000,44.5000) scale(0.017578,-0.017578)"><path d="M276 503Q276 317 353.0 216.0Q430 115 578 115Q695 115 765.5 162.0Q836 209 861 281L1019 236Q922 -20 578 -20Q338 -20 212.5 123.0Q87 266 87 548Q87 816 212.5 959.0Q338 1102 571 1102Q1048 1102 1048 527V503ZM862 641Q847 812 775.0 890.5Q703 969 568 969Q437 969 360.5 881.5Q284 794 278 641Z"/></g>' +
    '<g transform="translate(171.3215,44.5000) scale(0.017578,-0.017578)"><path d="M825 0V686Q825 793 804.0 852.0Q783 911 737.0 937.0Q691 963 602 963Q472 963 397.0 874.0Q322 785 322 627V0H142V851Q142 1040 136 1082H306Q307 1077 308.0 1055.0Q309 1033 310.5 1004.5Q312 976 314 897H317Q379 1009 460.5 1055.5Q542 1102 663 1102Q841 1102 923.5 1013.5Q1006 925 1006 721V0Z"/></g>' +
    '<g transform="translate(191.6430,44.5000) scale(0.017578,-0.017578)"><path d="M554 8Q465 -16 372 -16Q156 -16 156 229V951H31V1082H163L216 1324H336V1082H536V951H336V268Q336 190 361.5 158.5Q387 127 450 127Q486 127 554 141Z"/></g>' +
    '<g transform="translate(201.9449,44.5000) scale(0.017578,-0.017578)"><path d="M142 0V830Q142 944 136 1082H306Q314 898 314 861H318Q361 1000 417.0 1051.0Q473 1102 575 1102Q611 1102 648 1092V927Q612 937 552 937Q440 937 381.0 840.5Q322 744 322 564V0Z"/></g></g>' +
    '<g fill="none" stroke-linecap="round">' +
    '<path d="M219.0 25.8 L239.0 44.5" stroke="#1B2A4A" stroke-width="4.5"/>' +
    '<path d="M219.0 44.5 L246.0 17" stroke="#1D9E75" stroke-width="4.5"/></g></svg>';

  // White marks with a gold accent (the Private differentiator).
  var LOGO_WHITE = LOGO_NAVY.replace(/#1B2A4A/g, "#FFFFFF").replace(/#1D9E75/g, "#C6A667");

  var page = document.body.getAttribute("data-page") || "";

  /* ---- Primary sections (the institution's index).
          Private is a single scrolling page — the menu jumps to sections. ---- */
  var SECTIONS = [
    { href: "#firm",         label: "The Private Firm",  desc: "Origin, philosophy, distinction" },
    { href: "#concept",      label: "Our Concept",       desc: "What replaces conventional advice" },
    { href: "#principals",   label: "The Principals",    desc: "Three complementary leaders" },
    { href: "#architecture", label: "Our Architecture",  desc: "How engagements are designed and executed" },
    { href: "#mandates",     label: "Private Mandates",  desc: "Consequential assignments, considered" },
    { href: "#timeline",     label: "Timeline",          desc: "The decisions that shaped the firm" },
    { href: "#friends",      label: "Friends & Partners",desc: "Selected relationships and ecosystems" },
    { href: "#events",       label: "Events",            desc: "Where consequential people gather" },
    { href: "#philanthropy", label: "Philanthropy",      desc: "Legacy, access and contribution" },
    { href: "#locations",    label: "Locations",         desc: "Selected points of access" },
    { href: "#journal",      label: "Journal",           desc: "Selective observations, not content" },
    { href: "#access",       label: "Private Access",    desc: "Request private consideration" }
  ];

  function num(i) { return (i < 9 ? "0" : "") + (i + 1); }

  var menuItems = SECTIONS.map(function (s, i) {
    return '<a class="pvx-menu-link" href="' + s.href + '">' +
      '<span class="pvx-menu-num">' + num(i) + '</span>' +
      '<span class="pvx-menu-text"><span class="pvx-menu-label">' + s.label + '</span>' +
      '<span class="pvx-menu-desc">' + s.desc + '</span></span></a>';
  }).join("");

  var brand =
    '<a class="pvx-brand" href="private.html" aria-label="ArcCentrx Private — home">' +
      '<span class="pvx-brand-mark">' + LOGO_WHITE + '</span>' +
      '<span class="pvx-brand-tag">Private</span>' +
    '</a>';

  var headerHTML =
    '<header class="pvx-header" id="pvx-top">' +
      '<div class="pvx-header-inner">' +
        brand +
        '<div class="pvx-header-actions">' +
          '<a class="pvx-access" href="#access">Private Access</a>' +
          '<button class="pvx-menu-btn" type="button" aria-expanded="false" aria-controls="pvx-overlay">' +
            '<span class="pvx-menu-bars" aria-hidden="true"></span>' +
            '<span class="pvx-menu-btn-label">Menu</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</header>' +
    '<div class="pvx-overlay" id="pvx-overlay" role="dialog" aria-modal="true" aria-label="Sections" hidden>' +
      '<div class="pvx-overlay-inner">' +
        '<div class="pvx-overlay-head">' +
          '<span class="pvx-overlay-eyebrow">ArcCentrx Private</span>' +
          '<button class="pvx-close" type="button" aria-label="Close menu">Close</button>' +
        '</div>' +
        '<nav class="pvx-menu" aria-label="Private sections">' + menuItems + '</nav>' +
        '<div class="pvx-overlay-foot">' +
          '<div class="pvx-overlay-utility">' +
            '<a href="#access">Private Access</a>' +
            '<a href="#legal">Legal &amp; Disclosures</a>' +
            '<a href="index.html">Return to ArcCentrx</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var footerHTML =
    '<footer class="pvx-footer">' +
      '<div class="pvx-footer-inner">' +
        '<div class="pvx-footer-brand">' +
          '<a class="pvx-brand" href="private.html" aria-label="ArcCentrx Private — home">' +
            '<span class="pvx-brand-mark">' + LOGO_WHITE + '</span>' +
            '<span class="pvx-brand-tag">Private</span>' +
          '</a>' +
          '<p>The founder-led institutional development firm. Highly selective, by introduction.</p>' +
          '<a class="pvx-footer-access" href="#access">Request private consideration</a>' +
        '</div>' +
        '<div class="pvx-footer-cols">' +
          '<div class="pvx-footer-col"><h4>The Firm</h4>' +
            '<a href="#firm">The Private Firm</a>' +
            '<a href="#concept">Our Concept</a>' +
            '<a href="#principals">The Principals</a>' +
            '<a href="#architecture">Our Architecture</a>' +
          '</div>' +
          '<div class="pvx-footer-col"><h4>Engagement</h4>' +
            '<a href="#mandates">Private Mandates</a>' +
            '<a href="#timeline">Timeline</a>' +
            '<a href="#friends">Friends &amp; Partners</a>' +
            '<a href="#access">Private Access</a>' +
          '</div>' +
          '<div class="pvx-footer-col"><h4>Universe</h4>' +
            '<a href="#events">Events</a>' +
            '<a href="#philanthropy">Philanthropy</a>' +
            '<a href="#locations">Locations</a>' +
            '<a href="#journal">Journal</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pvx-footer-base">' +
        '<span class="pvx-footer-copy">© <span data-year></span> ArcCentrx Private. All rights reserved.</span>' +
        '<span class="pvx-footer-rel">The founder-led division of <a href="index.html">ArcCentrx</a>.</span>' +
        '<span class="pvx-footer-legal">' +
          '<a href="#legal">Legal</a>' +
          '<a href="#legal">Privacy</a>' +
          '<a href="#legal">Accessibility</a>' +
        '</span>' +
      '</div>' +
    '</footer>';

  /* ---- Inject ---- */
  var headerMount = document.querySelector("[data-private-header]");
  var footerMount = document.querySelector("[data-private-footer]");
  if (headerMount) headerMount.innerHTML = headerHTML;
  if (footerMount) footerMount.innerHTML = footerHTML;

  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Full-screen menu overlay ---- */
  var overlay = document.getElementById("pvx-overlay");
  var menuBtn = document.querySelector(".pvx-menu-btn");
  var closeBtn = document.querySelector(".pvx-close");
  var lastFocus = null;

  function openMenu() {
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    // next frame so the transition runs
    requestAnimationFrame(function () { document.body.classList.add("pvx-menu-open"); });
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
    if (closeBtn) closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }
  function closeMenu() {
    if (!overlay) return;
    document.body.classList.remove("pvx-menu-open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKeydown);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hide = function () { overlay.hidden = true; };
    if (reduce) { hide(); }
    else { window.setTimeout(hide, 300); }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKeydown(e) {
    if (e.key === "Escape") { closeMenu(); return; }
    if (e.key === "Tab" && overlay && !overlay.hidden) {
      // simple focus trap within the overlay
      var f = overlay.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", function (e) {
    // Backdrop click closes.
    if (e.target === overlay) { closeMenu(); return; }
    // In-page anchor: close the overlay, then scroll the section into view.
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) {
      e.preventDefault();
      var id = a.getAttribute("href");
      var target = id.length > 1 ? document.querySelector(id) : null;
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      closeMenu();
      if (target) {
        window.setTimeout(function () {
          target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
          if (history.replaceState) history.replaceState(null, "", id);
        }, reduce ? 0 : 140);
      }
    }
  });

  /* ---- Sticky header condense on scroll ---- */
  var header = document.querySelector(".pvx-header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Scroll reveal (ported; respects reduced motion via CSS) ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
