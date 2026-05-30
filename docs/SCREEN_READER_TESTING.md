# Screen Reader Verification Guide — Club Cover Image Alt Text

## Overview

This document describes how to manually verify that the accessibility
improvements to club cover images work correctly with assistive technology.

---

## What Changed

| Component    | Before          | After                                                        |
|------------- |-----------------|--------------------------------------------------------------|
| `ClubCard`   | `alt=""`        | `alt={getClubImageAlt(club.name, club.cover_image_alt)}`     |
| `ClubProfile`| `alt=""`        | `alt={getClubImageAlt(club.name, club.cover_image_alt)}`     |

### Fallback Priority

1. **`club.cover_image_alt`** — explicit alt text from the API (when available)
2. **`"${club.name} cover image"`** — derived from the club name
3. **`"Club cover image"`** — generic fallback

---

## Testing with Screen Readers

### NVDA (Windows — free)

1. Install NVDA from <https://www.nvaccess.org/download/>
2. Start the dev server: `npm run dev`
3. Open the app in Firefox or Chrome
4. Press **Insert + Space** to enable browse mode
5. Navigate to a clubs listing page (`/clubs`)
6. Use **G** key to jump between images
7. **Verify**: NVDA announces *"Robotics Club cover image, graphic"* (or the
   club's actual name) instead of silently skipping the image

### JAWS (Windows — commercial)

1. Open the clubs page in Chrome or Edge
2. Use **G** key to move between graphics
3. **Verify**: JAWS reads the alt text aloud for each cover image

### VoiceOver (macOS)

1. Press **Cmd + F5** to enable VoiceOver
2. Open the clubs page in Safari
3. Use **VO + Right Arrow** to navigate through elements
4. **Verify**: VoiceOver announces the alt text for cover images

### VoiceOver (iOS)

1. Open Settings → Accessibility → VoiceOver → enable
2. Open the clubs page in Safari
3. Swipe right to navigate through elements
4. **Verify**: each club cover image is announced with descriptive text

---

## Automated Accessibility Audits

### Lighthouse (Chrome DevTools)

1. Open Chrome DevTools → **Lighthouse** tab
2. Check **Accessibility** and run the audit
3. Look for *"Image elements have `[alt]` attributes"* — it should pass

### axe DevTools (Browser Extension)

1. Install axe DevTools for [Chrome](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)
2. Open the clubs page and run a scan
3. Confirm no *"Images must have alternate text"* violations

---

## Expected Results

| Scenario                          | Expected `alt` value                          |
|-----------------------------------|-----------------------------------------------|
| Club with name, no explicit alt   | `"Robotics Club cover image"`                 |
| Club with explicit alt text       | `"Team photo at annual expo"` (the API value) |
| Club with no name or alt          | `"Club cover image"`                          |
| Club with no cover image URL      | No `<img>` rendered (gradient placeholder)    |
| ClubCard in compact mode          | No cover image rendered at all                |
