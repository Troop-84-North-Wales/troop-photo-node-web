/* Site behaviour — you normally don't need to edit this file.
   All settings live in js/config.js. */
(function () {
  "use strict";
  var C = window.TROOP_CONFIG || {};

  function isSet(v) {
    return typeof v === "string" && v.trim() !== "" && v.indexOf("PASTE_") !== 0;
  }

  // Fill any element with data-field="key" from config
  document.querySelectorAll("[data-field]").forEach(function (el) {
    var v = C[el.getAttribute("data-field")];
    if (isSet(v)) el.textContent = v;
  });
  document.querySelectorAll("[data-href]").forEach(function (el) {
    var v = C[el.getAttribute("data-href")];
    if (isSet(v)) el.setAttribute("href", v);
  });

  // Contact email buttons
  document.querySelectorAll("[data-email]").forEach(function (el) {
    if (isSet(C.contactEmail)) {
      el.setAttribute("href", "mailto:" + C.contactEmail);
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- Calendar page ----
  var calWrap = document.getElementById("calendar-embed");
  if (calWrap) {
    var id = C.googleCalendarId;
    var empty = document.getElementById("calendar-empty");
    if (isSet(id)) {
      var src;
      if (/^https?:\/\//i.test(id.trim())) {
        src = id.trim();
      } else {
        src = "https://calendar.google.com/calendar/embed?src=" +
          encodeURIComponent(id.trim()) +
          "&ctz=" + encodeURIComponent(C.calendarTimeZone || "America/New_York") +
          "&mode=MONTH&showTitle=0&showPrint=0";
      }
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = (C.troopName || "Troop") + " Google Calendar";
      iframe.loading = "lazy";
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("scrolling", "no");
      calWrap.appendChild(iframe);
      calWrap.hidden = false;
      if (empty) empty.hidden = true;
    } else {
      calWrap.hidden = true;
      if (empty) empty.hidden = false;
    }
  }

  // ---- Photos page ----
  var galleries = [
    { key: "facebookPhotosUrl", card: "card-facebook" },
    { key: "googlePhotosUrl", card: "card-google" }
  ];
  var anyGallery = false, onPhotos = false;
  galleries.forEach(function (g) {
    var card = document.getElementById(g.card);
    if (!card) return;
    onPhotos = true;
    var url = C[g.key];
    if (isSet(url)) {
      anyGallery = true;
      card.querySelector("a.btn").setAttribute("href", url);
      card.hidden = false;
    } else {
      card.hidden = true;
    }
  });
  var photosEmpty = document.getElementById("photos-empty");
  if (onPhotos && photosEmpty) photosEmpty.hidden = anyGallery;
})();
