# Find it for me («Βρες μου το ακίνητο»): feature spec

George Tsigaras, 02/11/2026. **Idea and design only.** Nothing here is part of the site build, and nothing should be merged into `apps/` as it is.

## Summary

A signed-in member opens a map and taps the parcel of a property they like. It can be any property type: house, flat, plot, field or building. They sign an exclusive search mandate online, and we take it from there. After that the customer simply waits for our answer by email and phone.

**Pilot scope:** one section on the home page and three pages (map, mandate, done). There is no customer tracking panel. We measure the results before we extend it.

| Area | Status |
|---|---|
| Flow, screens, Greek copy | ✅ Approved by George |
| Mockups on the real site code | ✅ See `mockups/` and `code/` |
| Map data (Cadastre parcels) | ✅ Live Cadastre service, with the open-data copy as fallback |
| Mandate text | ⏳ George is finalising it with the lawyer. Build with the draft and expect it to change |
| Fee and the "no fee if no purchase" promise | ⏳ George decides. Do not show any fee wording as final |
| The other 8 languages | ⏳ To translate from the Greek copy |
| Production | ⛔ Nothing is deployed. Deploys go through George or Sergei as usual |

## User flow

1. **Home section.** It sits after «Collections» and before «Study & construction». It has a short text, three steps, a static image of real parcels and the button «Show it to us on the map».
2. **Map page.** The visitor finds the village and zooms in until the parcel lines show. Tapping a parcel highlights it, and the panel asks «Is this the one?».
3. **Sign-in gate.** Guests can browse and tap, but they must sign in to send (email or mobile, with a one-time code). The tapped parcel is kept through the sign-in.
4. **Brake.** A member can have at most 3 open requests. With 3 open, the map shows the brake message instead of the send button.
5. **Mandate page.** It shows the customer details (see below), a short summary, a link to the full text, one checkbox and «Sign and send». A copy goes to the customer's email.
6. **Done page.** A confirmation. There is nothing else for the customer to do; we answer by email and phone.
7. **Back office.** The request lands in the CRM as a new request type, and the office handles it.

## Screens and copy

The mockups are in `mockups/`: `_d` is desktop at 1280 px and `_m` is phone at 390 px. The English text in the mockups is the English copy to build. The Greek copy is in `code/` and is approved word for word. HP speaks to the customer in the singular in Greek.

| Screen | Key English copy |
|---|---|
| Home | Find it for me · Which property do you want? · We know Halkidiki property by property. Show us on the map the one you like, and we will help you make it yours. · Show it / We locate it / We help you · Show it to us on the map |
| Map, empty | Show us the property · Find the village. Zoom in until the plot boundaries appear. Tap the property: a house, a plot, a field or a building. · Our own listings are not shown on this map. · You can show us up to 3 properties. |
| Map, tapped | Is this the one? · Parcel of about N m² (indicative, from the Cadastre) · Yes, this is it / Another spot · See it on the official Cadastre map ↗ |
| Map, guest | To send it, sign in with your email or mobile. Your pin will be waiting here. · Sign in and continue |
| Map, brake | You already have 3 properties in progress. We will answer those first. As soon as we answer one, you can show us the next. |
| Mandate | The mandate · Your details · Property / Duration / Fee / When it is due · I have read and accept the mandate. · Sign and send |
| Done | We have taken it on · The property in Afytos is in our hands. We will get back to you, by email and by phone. |

There is **no** "my requests" page and no panel row. George removed them because there is no customer tracking.

## Map and cadastre data

- **Base map:** use the map the new site already uses. The Esri satellite tiles in the prototype are for the mockups only and must not ship.
- **Parcels:** load them live from the Hellenic Cadastre public ArcGIS service (`services-eu1.arcgis.com/40tFGWzosjaLJpmn/…/GEOTEMAXIA_LEITOURGOUN_ON_gdb` and its sibling layers; copy the exact URLs from the CRM code). Show parcels only from about zoom 17, and query by the current map extent. On tap, store the point, the parcel geometry, its area and the ΚΑΕΚ if the layer returns it.
- **Fallback:** if the live service fails, use the data.gov.gr open-data copy (CC BY, Central Macedonia). `code/apps/hp/public/design/afytos-parcels.geojson` is an Afytos extract for testing.
- **Rules from the terms:**
  - Always show «Πηγή δεδομένων: Ν.Π.Δ.Δ. ΕΛΛΗΝΙΚΟ ΚΤΗΜΑΤΟΛΟΓΙΟ».
  - Draw the outlines unaltered and label areas as indicative.
  - Never show owner data.
  - No Cadastre orthophotos.
  - No ΤΕΕ building terms.
- **Our listings never appear on this map.**

## The mandate

The text is our existing viewing order, with the corrections the law requires and an annex for the exclusive search. The lawyer is checking it. Store it as a versioned template (el + en) loaded from config.

**Fields the customer must give** (ν. 4072/2012 art. 200; an order without the ΑΦΜ has been held void):

| Field | Notes |
|---|---|
| Full name, or full company name | For a company: also the legal representative |
| Tax number (ΑΦΜ) | Foreign buyer without a Greek ΑΦΜ: foreign tax number + country |
| Home address, mobile, email | The mobile receives the one-time code; the email receives the signed copy |
| Contract type | Buy / rent / exchange |
| ID card or passport | **Do not ask.** It is not needed at this stage |

Pre-fill everything we already know from the profile, and ask only for what is missing.

**Signing:**

1. Render the full text as a PDF, with the customer's details and the parcel.
2. Send an SMS code and wait for the customer to confirm it.
3. Email the PDF.
4. Store the evidence and create the CRM request.

**Evidence to keep.** It can never be edited after signing; a correction is a new mandate.

- the PDF and its SHA-256 hash
- the template version and language
- the time the email was sent
- the code: when it was sent, to which number, and when it was confirmed
- the time of signing, the IP and the user agent
- the member id and the parcel data

RW Control already does most of this for viewing slips.

## Rules and limits

| Rule | Detail |
|---|---|
| Members only can send | The tapped parcel survives the sign-in round trip |
| Brake: up to 3 open | Check it on the server. Make the number and its mode config values (George still has to confirm "open at a time" vs "3 in total") |
| No tracking panel, no adviser shown | Assignment happens only inside the CRM |
| Wording bans, in every language | Never «ακόμα κι αν δεν πωλείται» (even if not for sale) or «βρίσκουμε τον ιδιοκτήτη» (we find the owner). No owner data reaches the customer |
| No public counts | Never show how many properties or requests we have |
| noindex | The map, mandate and done pages are noindex |

## CRM / back office

Agree the API with the CRM stream before you start.

- **New request type:** "Owner search".
- **Payload:** member id, ΚΑΕΚ, point, parcel geometry, village and municipality, area, mandate id and PDF, signed-at time, language.
- **Internal statuses:** New → ΚΑΕΚ check → Owner search → Contact → Available / Not now. The customer never sees them.
- **Brake slots:** closing a request frees one of the customer's 3 slots.
- **Notifications:** the office gets an email for each new request. The customer gets only the mandate copy, then our personal answer.

## Code in this folder

| Path | What it is |
|---|---|
| `code/apps/hp/src/components/FindIt.astro` | Home section, Greek and English |
| `code/apps/hp/src/pages/design/vres-mou/[screen].astro` | Screens `map`, `mandate`, `done`. Query flags: `?lang=en`, `?pin=0` (empty map), `?full=1` (brake) |
| `code/HomePage.diff` | The change that inserts the section after Collections |
| `code/apps/hp/public/design/` | Home image and the Afytos parcels |

The base is `dev` at `525a4cc`. Suggested real routes: a localized slug under each language prefix, with mandate and done as steps of it, reusing the `RequestPage` layout.

## Acceptance criteria

- [ ] The home section shows after Collections, with the source line, at 1280 and 390 px.
- [ ] The live parcels load. If they fail, the fallback loads and the page does not break.
- [ ] A tapped parcel is highlighted, shows its village and indicative area, and links to the official Cadastre viewer.
- [ ] None of our listings appear on the map.
- [ ] A guest returns to the same parcel after signing in.
- [ ] With 3 open requests, the brake message shows and the server refuses a 4th.
- [ ] The mandate requires name, ΑΦΜ (or foreign tax number + country), address, mobile and email. It never asks for an ID.
- [ ] Signing needs the checkbox and the SMS code. The PDF is emailed, and the evidence is stored and cannot be edited.
- [ ] An "Owner search" request appears in the CRM, and the office gets an email.
- [ ] Nothing shows the customer an adviser, a status or owner data.
- [ ] No banned wording appears in any of the 9 languages.
- [ ] Tested on staging only, and nothing goes to `main` without asking first.

## Open items

1. Final mandate text (George and the lawyer).
2. Fee and "no fee if no purchase" (George).
3. Brake mode (George).
4. Exclusive duration, 6 or 8 months.
5. The Cadastre "resale" clause (lawyer).
6. Lawful contact with owners under GDPR (lawyer).
7. Translations.
8. A tested fallback, because the live Cadastre service has no SLA.
