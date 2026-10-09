/* Facebook photo carousel — vanilla JS, no dependencies.
   Loads photos from the site's own /api/photos endpoint (the Facebook token
   stays on the server). Settings live in js/config.js. */
(function () {
  "use strict";
  var C = window.TROOP_CONFIG || {};
  var roots = document.querySelectorAll("[data-carousel]");
  if (!roots.length) return;

  var INTERVAL = Math.max(1500, Number(C.carouselIntervalMs) || 5000);
  var SHOW_CAPTIONS = C.carouselShowCaptions !== false;
  var SHOW_DATES = C.carouselShowDates === true;
  var MAX = Number(C.carouselMaxPhotos) || 0;
  var FB_URL = C.facebookPageUrl || "https://www.facebook.com/1312640681940485";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

  var photosPromise = null;
  function loadPhotos() {
    if (!photosPromise) {
      photosPromise = fetch("/api/photos", { headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok || !Array.isArray(j)) throw new Error((j && j.error) || "HTTP " + r.status);
            return j;
          });
        });
    }
    return photosPromise;
  }

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function fmtDate(iso) {
    var d = new Date(String(iso).replace(/\+0000$/, "Z"));
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function fallback(root, msg) {
    var vp = root.querySelector(".carousel-viewport");
    vp.innerHTML = "";
    var box = el("div", "carousel-status carousel-error", { role: "status" });
    box.innerHTML = '<div class="icon" aria-hidden="true">📷</div><p></p>' +
      '<a class="btn btn-gold" target="_blank" rel="noopener">See our photos on Facebook ↗</a>';
    box.querySelector("p").textContent = msg || "Photos couldn't be loaded right now.";
    box.querySelector("a").href = FB_URL;
    vp.appendChild(box);
  }

  function build(root, photos) {
    var vp = root.querySelector(".carousel-viewport");
    var prevBtn = root.querySelector(".carousel-btn.prev");
    var nextBtn = root.querySelector(".carousel-btn.next");
    var bar = root.querySelector(".carousel-bar");
    var counter = root.querySelector(".carousel-counter");
    var playBtn = root.querySelector(".carousel-play");
    var progress = el("div", "carousel-progress", { "aria-hidden": "true" });

    vp.innerHTML = "";
    var slides = photos.map(function (p, i) {
      var a = el("a", "carousel-slide", {
        href: p.link, target: "_blank", rel: "noopener",
        role: "group", "aria-roledescription": "slide",
        "aria-label": "Photo " + (i + 1) + " of " + photos.length,
        "aria-hidden": "true", tabindex: "-1"
      });
      a._photo = p;
      return a;
    });
    slides.forEach(function (s) { vp.appendChild(s); });
    vp.appendChild(progress);
    [prevBtn, nextBtn, bar].forEach(function (b) { b.hidden = photos.length < 2 && b !== bar; });
    bar.hidden = false;

    function ensureLoaded(i) {
      var s = slides[(i + slides.length) % slides.length];
      if (s._loaded) return;
      s._loaded = true;
      var p = s._photo;
      s.style.setProperty("--bg", 'url("' + p.src.replace(/"/g, "%22") + '")');
      var img = el("img", "", {
        src: p.src, alt: p.caption ? p.caption : "Troop 84 photo",
        decoding: "async", draggable: "false"
      });
      if (p.width && p.height) { img.width = p.width; img.height = p.height; }
      img.addEventListener("error", function () { s.classList.add("is-broken"); });
      s.appendChild(img);
      var capText = SHOW_CAPTIONS && p.caption ? p.caption : "";
      var date = SHOW_DATES ? fmtDate(p.created_time) : "";
      if (capText || date) {
        var cap = el("div", "carousel-caption");
        if (capText) { var t = el("span", "cap-text"); t.textContent = capText; cap.appendChild(t); }
        if (date) { var d = el("span", "cap-date"); d.textContent = date; cap.appendChild(d); }
        s.appendChild(cap);
      }
    }

    var index = 0, timer = null, hoverPause = false, focusPause = false;
    var userPaused = !!(reduceMotion && reduceMotion.matches);

    function show(i) {
      var n = slides.length;
      i = ((i % n) + n) % n;
      slides[index].classList.remove("is-active");
      slides[index].setAttribute("aria-hidden", "true");
      slides[index].tabIndex = -1;
      index = i;
      ensureLoaded(i); ensureLoaded(i + 1); ensureLoaded(i - 1); // preload neighbours
      slides[i].classList.add("is-active");
      slides[i].setAttribute("aria-hidden", "false");
      slides[i].tabIndex = 0;
      counter.textContent = (i + 1) + " / " + n;
      schedule();
    }

    function running() { return !userPaused && !hoverPause && !focusPause && !document.hidden && slides.length > 1; }

    function schedule() {
      clearTimeout(timer);
      progress.classList.remove("run");
      root.classList.toggle("is-paused", !running());
      if (!running()) return;
      void progress.offsetWidth; // restart CSS animation
      progress.style.animationDuration = INTERVAL + "ms";
      progress.classList.add("run");
      timer = setTimeout(function () { show(index + 1); }, INTERVAL);
    }

    function updatePlayBtn() {
      playBtn.textContent = userPaused ? "▶" : "❚❚";
      playBtn.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
      playBtn.setAttribute("aria-pressed", userPaused ? "true" : "false");
    }

    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    playBtn.addEventListener("click", function () { userPaused = !userPaused; updatePlayBtn(); schedule(); });

    root.addEventListener("mouseenter", function () { hoverPause = true; schedule(); });
    root.addEventListener("mouseleave", function () { hoverPause = false; schedule(); });
    root.addEventListener("focusin", function () { focusPause = true; schedule(); });
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) { focusPause = false; schedule(); }
    });
    document.addEventListener("visibilitychange", schedule);
    if (reduceMotion && reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", function (e) { userPaused = e.matches; updatePlayBtn(); schedule(); });
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });

    // Touch swipe
    var sx = null, sy = 0, swiped = false;
    vp.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiped = false;
    }, { passive: true });
    vp.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; show(index + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
    vp.addEventListener("click", function (e) { if (swiped) { e.preventDefault(); swiped = false; } }, true);

    updatePlayBtn();
    show(0);
  }

  roots.forEach(function (root) {
    loadPhotos().then(function (photos) {
      photos = photos.slice();
      if (C.carouselShuffle) shuffle(photos);
      if (MAX > 0) photos = photos.slice(0, MAX);
      if (!photos.length) return fallback(root, "No photos have been posted yet.");
      build(root, photos);
    }).catch(function () {
      fallback(root, "Photos couldn't be loaded right now.");
    });
  });
})();
