/* =====================================================================
   TROOP 84 SITE SETTINGS  —  EDIT THIS FILE TO UPDATE THE WEBSITE
   ---------------------------------------------------------------------
   This is the ONE place to change troop info, the Google Calendar,
   and photo gallery links. Save the file and refresh the browser.
   Keep the quotes "..." around every value and the comma at line end.
   ===================================================================== */
window.TROOP_CONFIG = {
  // --- Troop basics ---------------------------------------------------
  troopName: "Troop 84",
  troopFullName: "BSA Troop 84 North Wales, PA",
  town: "North Wales, PA",

  // --- Meetings -------------------------------------------------------
  meetingDay: "Thursday evenings",
  meetingTime: "7:30–9:00 pm",
  meetingPlace: "North Wales Scout Center",
  meetingAddress: "300 Church Street, North Wales, PA",

  // --- Contact (leave "" to hide the email button) --------------------
  contactEmail: "Troop84NWales@Gmail.com",

  // --- Google Calendar ------------------------------------------------
  // PLACEHOLDER: paste your public Google Calendar ID here.
  // It looks like  abc123xyz@group.calendar.google.com
  // (or yourname@gmail.com for a personal calendar).
  // You may also paste the full embed URL that starts with
  // https://calendar.google.com/calendar/embed?src=...
  // See README.md → "Google Calendar" for step-by-step instructions.
  googleCalendarId: "5tespi39ansmoqgd7onj1u3dh8@group.calendar.google.com",
  calendarTimeZone: "America/New_York",

  // --- Photo galleries ------------------------------------------------
  // PLACEHOLDER: paste the share link for each gallery.
  // Leave as-is (or "") to hide a gallery card.
  facebookPhotosUrl: "https://www.facebook.com/Troop84NWalesPA/photos",

  // --- Facebook photo carousel ------------------------------------------
  // Photos are loaded live from the server's /api/photos endpoint.
  carouselIntervalMs: 5000,          // time each photo is shown (ms)
  carouselShowCaptions: true,        // show the Facebook caption if present
  carouselShowDates: false,          // show the Facebook upload date (all were bulk-uploaded, so off)
  carouselMaxPhotos: 0,              // 0 = all photos; e.g. 40 to limit
  carouselShuffle: false,            // true = random order instead of newest first
  facebookPageUrl: "https://www.facebook.com/1312640681940485",
  googlePhotosUrl: "PASTE_GOOGLE_PHOTOS_ALBUM_URL_HERE",

  // --- Links ----------------------------------------------------------
  scoutsBsaInfoUrl: "https://www.scouting.org/programs/scouts-bsa/",
  originalSiteUrl: "https://www.troop84northwalespa.org/"
};
