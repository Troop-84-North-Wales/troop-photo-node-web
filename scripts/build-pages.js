#!/usr/bin/env node
// Builds the static GitHub Pages version of the site into ./_site.
// Copies public/ and writes api/photos.json with ONLY the Fundraisers album
// (fetched server-side here, so the Facebook token never ships with the site).
// If the token is missing or Facebook fails, photos.json is [] and the poster
// section simply stays hidden.
"use strict";
const fs = require("fs");
const path = require("path");
const { fetchAllPhotos, scrub, PUBLIC_DIR, hasToken } = require("../server.js");

const OUT = path.join(__dirname, "..", "_site");

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(PUBLIC_DIR, OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

  let photos = [];
  if (!hasToken) {
    console.warn("FB_PAGE_TOKEN not set: building without posters.");
  } else {
    try {
      photos = await fetchAllPhotos();
      console.log(`Fetched ${photos.length} poster(s) from the Fundraisers album.`);
    } catch (e) {
      console.warn("Could not fetch posters, building without them:", scrub(e.message));
    }
  }
  fs.mkdirSync(path.join(OUT, "api"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "api", "photos.json"), JSON.stringify(photos));
  console.log("Static site written to _site/");
})();
