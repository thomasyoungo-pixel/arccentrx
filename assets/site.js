/* =========================================================================
   ArcCentrx — shared site behavior
   Injects a consistent header + footer on every page, and wires up the
   interactive bits: mobile nav, Services dropdown, sticky-header shadow,
   scroll-reveal, contact form, and the auto-updating copyright year.
   Each page sets: <body data-page="home|services|about|blog|contact|
   assess|align|accelerate"> so the correct nav item is highlighted.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- Brand marks (navy for header, reversed for footer) ---- */
  var LOGO_NAVY =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 259 70" aria-label="ArcCentrx">' +
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

  var LOGO_REVERSED =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -8 276.31 86.81" aria-label="ArcCentrx">' +
    '<rect x="-14" y="-8" width="276.31" height="86.81" rx="10" fill="#0d1c30"/>' +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 60 L27 10 L50 60" stroke="#FFFFFF" stroke-width="8"/>' +
    '<path d="M9.52 48 A25.3 25.3 0 0 1 44.48 48" stroke="#FFFFFF" stroke-width="6"/></g>' +
    '<g fill="#FFFFFF"><g transform="translate(52.1200,64.0000) scale(0.081330,-0.081330)"><path d="M134 -7Q109 -7 95.5 7.0Q82 21 82 46V652Q82 678 96.0 691.5Q110 705 135 705H374Q488 705 550.0 651.0Q612 597 612 498Q612 434 584.0 388.0Q556 342 502.5 318.0Q449 294 374 294L383 308H409Q449 308 478.5 288.0Q508 268 532 224L618 64Q628 46 627.5 29.5Q627 13 615.5 3.0Q604 -7 583 -7Q561 -7 547.5 2.5Q534 12 523 31L418 225Q397 264 370.0 277.5Q343 291 299 291H186V46Q186 21 173.0 7.0Q160 -7 134 -7ZM186 369H357Q433 369 472.0 401.0Q511 433 511 496Q511 558 472.0 590.0Q433 622 357 622H186Z"/></g></g>' +
    '<g fill="#FFFFFF"><g transform="translate(103.3500,64.0000) scale(0.080090,-0.080090)"><path d="M398 -9Q291 -9 215.0 35.0Q139 79 98.5 160.5Q58 242 58 353Q58 436 81.0 502.5Q104 569 147.5 616.5Q191 664 254.5 689.0Q318 714 398 714Q457 714 511.5 698.0Q566 682 606 652Q623 641 628.5 625.5Q634 610 630.5 596.0Q627 582 617.0 572.5Q607 563 591.5 562.0Q576 561 558 573Q525 598 485.0 610.0Q445 622 401 622Q325 622 273.0 590.5Q221 559 194.0 499.0Q167 439 167 353Q167 267 194.0 206.5Q221 146 273.0 114.5Q325 83 401 83Q445 83 485.5 95.5Q526 108 562 133Q580 144 594.5 143.0Q609 142 619.0 133.0Q629 124 632.5 110.5Q636 97 631.5 82.5Q627 68 612 58Q571 25 515.0 8.0Q459 -9 398 -9Z"/></g></g>' +
    '<path d="M144.66 41.43 A10 10 0 1 1 144.66 28.57" fill="none" stroke="#5DCAA5" stroke-width="5" stroke-linecap="round"/>' +
    '<g fill="#FFFFFF">' +
    '<g transform="translate(151.0000,44.5000) scale(0.017578,-0.017578)"><path d="M276 503Q276 317 353.0 216.0Q430 115 578 115Q695 115 765.5 162.0Q836 209 861 281L1019 236Q922 -20 578 -20Q338 -20 212.5 123.0Q87 266 87 548Q87 816 212.5 959.0Q338 1102 571 1102Q1048 1102 1048 527V503ZM862 641Q847 812 775.0 890.5Q703 969 568 969Q437 969 360.5 881.5Q284 794 278 641Z"/></g>' +
    '<g transform="translate(171.3215,44.5000) scale(0.017578,-0.017578)"><path d="M825 0V686Q825 793 804.0 852.0Q783 911 737.0 937.0Q691 963 602 963Q472 963 397.0 874.0Q322 785 322 627V0H142V851Q142 1040 136 1082H306Q307 1077 308.0 1055.0Q309 1033 310.5 1004.5Q312 976 314 897H317Q379 1009 460.5 1055.5Q542 1102 663 1102Q841 1102 923.5 1013.5Q1006 925 1006 721V0Z"/></g>' +
    '<g transform="translate(191.6430,44.5000) scale(0.017578,-0.017578)"><path d="M554 8Q465 -16 372 -16Q156 -16 156 229V951H31V1082H163L216 1324H336V1082H536V951H336V268Q336 190 361.5 158.5Q387 127 450 127Q486 127 554 141Z"/></g>' +
    '<g transform="translate(201.9449,44.5000) scale(0.017578,-0.017578)"><path d="M142 0V830Q142 944 136 1082H306Q314 898 314 861H318Q361 1000 417.0 1051.0Q473 1102 575 1102Q611 1102 648 1092V927Q612 937 552 937Q440 937 381.0 840.5Q322 744 322 564V0Z"/></g></g>' +
    '<g fill="none" stroke-linecap="round">' +
    '<path d="M219.0 25.8 L239.0 44.5" stroke="#FFFFFF" stroke-width="4.5"/>' +
    '<path d="M219.0 44.5 L246.0 17" stroke="#5DCAA5" stroke-width="4.5"/></g></svg>';

  var caret = '<svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  var page = document.body.getAttribute("data-page") || "home";

  function isActive(p) { return page === p ? " active" : ""; }
  var servicesActive = (["services", "assess", "align", "accelerate"].indexOf(page) > -1) ? " active" : "";

  var navMarkup =
    '<a class="nav-link' + isActive("home") + '" href="index.html">Home</a>' +
    '<div class="nav-item">' +
      '<a class="nav-link' + servicesActive + '" href="services.html">Services ' + caret + '</a>' +
      '<div class="dropdown">' +
        '<a href="services.html"><strong>All services</strong><span>Overview of how we work</span></a>' +
        '<a href="assess.html"><strong>Assess</strong><span>Find out what\'s actually true</span></a>' +
        '<a href="align.html"><strong>Align</strong><span>Point the org one direction</span></a>' +
        '<a href="accelerate.html"><strong>Accelerate</strong><span>Embed and run the work</span></a>' +
      '</div>' +
    '</div>' +
    '<a class="nav-link' + isActive("about") + '" href="about.html">About</a>';

  var headerHTML =
    '<header class="site-header"><div class="header-inner">' +
      '<a class="brand" href="index.html">' + LOGO_NAVY + '</a>' +
      '<nav class="site-nav" aria-label="Primary">' + navMarkup + '</nav>' +
      '<div class="header-cta">' +
        '<a class="btn btn-teal" href="contact.html">Get in touch</a>' +
        '<button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false"><span></span></button>' +
      '</div>' +
    '</div></header>' +
    '<nav class="site-nav mobile" aria-label="Mobile">' + navMarkup +
      '<div class="mobile-cta"><a class="btn btn-teal" href="contact.html">Get in touch</a></div>' +
    '</nav>';

  var footerHTML =
    '<footer class="site-footer">' +
      '<div class="footer-top">' +
        '<div class="footer-brand">' + LOGO_REVERSED +
          '<p>Operators, not advisors. One integrated team that assesses, aligns, and accelerates — and does the work.</p>' +
        '</div>' +
        '<div class="footer-col"><h4>Company</h4>' +
          '<a href="about.html">About</a><a href="services.html">Services</a><a href="contact.html">Contact</a>' +
        '</div>' +
        '<div class="footer-col"><h4>Services</h4>' +
          '<a href="assess.html">Assess</a><a href="align.html">Align</a><a href="accelerate.html">Accelerate</a>' +
        '</div>' +
        '<div class="footer-col"><h4>Resources</h4>' +
          '<a href="blog.html">Blog</a><a href="contact.html">Get in touch</a>' +
        '</div>' +
      '</div>' +
      '<div class="copyright">© <span data-year></span> ArcCentrx. All rights reserved.</div>' +
    '</footer>';

  /* ---- Inject ---- */
  var headerMount = document.querySelector("[data-site-header]");
  var footerMount = document.querySelector("[data-site-footer]");
  if (headerMount) headerMount.innerHTML = headerHTML;
  if (footerMount) footerMount.innerHTML = footerHTML;

  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Expandable Services group inside the mobile panel
    var mobileNav = document.querySelector(".site-nav.mobile");
    if (mobileNav) {
      var item = mobileNav.querySelector(".nav-item");
      if (item) {
        var trigger = item.querySelector(".nav-link");
        trigger.addEventListener("click", function (e) {
          if (window.matchMedia("(max-width: 900px)").matches) {
            e.preventDefault();
            item.classList.toggle("open");
          }
        });
      }
      // Close menu after tapping a real link
      mobileNav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          if (!a.closest(".nav-item") || a.closest(".dropdown")) {
            document.body.classList.remove("nav-open");
          } else if (a.getAttribute("href") && a.getAttribute("href").indexOf(".html") > -1 && !a.querySelector(".caret")) {
            document.body.classList.remove("nav-open");
          }
        });
      });
    }
  }

  /* ---- Sticky header shadow ---- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Scroll reveal ---- */
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

  /* ---- Contact form → Netlify Function → Attio ---- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form-note");
      var btn = form.querySelector('button[type="submit"]');

      function setNote(msg, isError) {
        if (!note) return;
        note.textContent = msg;
        note.style.color = isError ? "#c0392b" : "";
      }

      // Honeypot: if a bot filled the hidden field, pretend success and stop.
      if (form.elements.company_website && form.elements.company_website.value) {
        setNote("Thanks — we'll be in touch shortly.", false);
        form.reset();
        return;
      }

      if (!form.checkValidity()) { form.reportValidity(); return; }

      var payload = {
        name: (form.elements.name && form.elements.name.value || "").trim(),
        email: (form.elements.email && form.elements.email.value || "").trim(),
        subject: (form.elements.subject && form.elements.subject.value || "").trim(),
        message: (form.elements.message && form.elements.message.value || "").trim()
      };

      if (btn) { btn.disabled = true; }
      setNote("Sending…", false);

      fetch("/.netlify/functions/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.text().then(function (txt) {
            var data = {};
            try { data = JSON.parse(txt); } catch (e) {}
            if (!res.ok) {
              var msg = data.error || ("HTTP " + res.status);
              if (data.detail) { msg += " — " + data.detail; }
              throw new Error(msg);
            }
            return data;
          });
        })
        .then(function () {
          setNote("Thanks — your message is on its way. We'll be in touch shortly.", false);
          form.reset();
        })
        .catch(function (err) {
          // Temporary debug detail during setup — surfaces the real server error.
          setNote("Send failed: " + (err && err.message ? err.message : "unknown error") + " · or email hello@arccentrx.com", true);
        })
        .finally(function () {
          if (btn) { btn.disabled = false; }
        });
    });
  }
})();
