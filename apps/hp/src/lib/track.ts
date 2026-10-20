// ═══════════════════════════════════════════════════════════════════════════
// ΣΗΜΑΝΣΗ ΣΥΜΒΑΝΤΩΝ — το μάθημα της 27/7.
//
// ΤΟ ΠΡΟΒΛΗΜΑ ΤΟΥ ΣΗΜΕΡΙΝΟΥ SITE: όλα τα σημεία εγγραφής πυροδοτούν ΕΝΑ
// συμβάν, `register_link_click`. Ο σύνδεσμος της κεφαλίδας, το «ξεκλείδωσε την
// περιοχή», το «δες τις φωτογραφίες» — όλα μαζί. Αποτέλεσμα: όταν ρωτήθηκε
// «ποιο φέρνει τις εγγραφές;», τα δεδομένα 12 μηνών ΔΕΝ μπόρεσαν να απαντήσουν.
//
// ΕΔΩ: κάθε σημείο έχει δικό του όνομα. Σε τρεις μήνες θα ξέρουμε.
//
// Πώς μπαίνει: `data-ev="register:header"` σε οποιοδήποτε στοιχείο. Τίποτε άλλο.
// Το script είναι ~15 γραμμές και δεν φορτώνει βιβλιοθήκη.
// ═══════════════════════════════════════════════════════════════════════════

/** Τα ονόματα είναι ΚΛΕΙΣΤΗ λίστα — αλλιώς σε έναν χρόνο έχουμε 40 παραλλαγές. */
// B-11 (2026-10-13): this is now THE list — every `data-ev` in the code is here and every name
// here is placed somewhere; `scripts/check-events.mjs` fails the build otherwise. Names that had
// no element (why_page, by_id, valuation_start, door_click, contact:trust) moved to RESERVED below.
export const EVENTS = {
  // Σημεία εγγραφής / σύνδεσης — το ερώτημα που θέλουμε να απαντηθεί
  REGISTER_HEADER: 'register:header',
  REGISTER_MENU: 'register:menu',
  REGISTER_UNLOCK_AREA: 'register:unlock_area',       // σελίδα ακινήτου (location lock, was register:map)
  REGISTER_UNLOCK_PHOTOS: 'register:unlock_photos',   // σελίδα ακινήτου (gallery lock, was register:gallery)
  REGISTER_PROPERTY_BLOCK: 'register:property_block', // property page: "what this page does not show" (D-061)
  REGISTER_OFF_MARKET: 'register:off_market',         // το μπλοκ των 79
  MEMBER_JOIN_FROM_LIST: 'member:join_from_list',
  MEMBER_FAVORITE: 'member:favorite_property',
  MEMBER_SAVE_SEARCH: 'member:save_search',
  PANEL_HEADER: 'panel:header',
  PANEL_MENU: 'panel:menu',

  // Πρόθεση αγοραστή
  SEARCH_SUBMIT: 'search:submit',
  FILTERS_OPEN: 'search:filters_open',
  CARD_CLICK: 'property:card_click',
  CARD_MORE: 'property:card_more',
  FEATURE_CLICK: 'property:feature_click',
  FEATURE_RENT: 'property:feature_rent',
  PHOTO_OPEN: 'property:photo_open',

  // Πρόθεση πωλητή — ο ακριβότερος lead
  VALUATION_REPORT: 'seller:valuation_report',
  CONSTRUCTION_PORTFOLIO: 'construction:portfolio',
  CONSTRUCTION_HAVE_LAND: 'construction:have_land',

  // Leads on the property page
  LEAD_FORM_SUBMIT: 'lead:form_submit',
  LEAD_TOUR_OPEN: 'lead:tour_open',
  LEAD_TOUR_OPEN_BAR: 'lead:tour_open_bar',
  LEAD_WHATSAPP: 'lead:whatsapp',
  LEAD_WHATSAPP_BAR: 'lead:whatsapp_bar',
  LEAD_RENT_IT: 'lead:rent_it',

  // ΕΠΙΚΟΙΝΩΝΙΑ — η υψηλότερη πρόθεση σε όλη τη σελίδα.
  // Ξεχωριστό όνομα ΑΝΑ ΣΗΜΕΙΟ: αν όλα λέγονταν «κλικ στο τηλέφωνο», δεν θα
  // μαθαίναμε ποτέ αν αξίζει το τηλέφωνο στην κεφαλίδα του κινητού.
  CALL_HEADER: 'call:header',
  CALL_MENU: 'call:menu',
  // Area and category pages (/en/property-for-sale/…, 20/10/2026).
  AREA_SHOW_ALL: 'area:show_all',
  AREA_BOOK_VIEWING: 'area:book_viewing',
  AREA_ADVISER: 'area:adviser',
  AREA_CALL: 'area:call',
  ARTICLE_BOOK_VIEWING: 'article:book_viewing',
  ARTICLE_ADVISER: 'article:adviser',
  ARTICLE_CALL: 'article:call',
  CALL_FOOTER: 'call:footer',
  CALL_PROPERTY: 'call:property',
  CALL_PROPERTY_BAR: 'call:property_bar',
  CALL_404: 'call:404',
  CONTACT_ABROAD: 'contact:abroad',

  // Content pages: the closing call to action, one name per target
  CONTENT_LIST: 'content:list',
  CONTENT_PHONE: 'content:phone',
  CONTENT_LOGIN: 'content:login',
  CONTENT_SELL: 'content:sell',
} as const;

// Reserved names from the 2026-07 plan, with no element on the site yet. Put one back into
// EVENTS together with its element:
//   REGISTER_WHY_PAGE 'register:why_page' («Γιατί να εγγραφείτε» — 10× απόδοση) · SEARCH_ID
//   'search:by_id' · VALUATION_START 'seller:valuation_start' · SELL_DOOR 'seller:door_click' ·
//   CONTACT_TRUST 'contact:trust'

/** Όλα τα επιτρεπτά ονόματα — ο έλεγχος γίνεται στον browser, δες πιο κάτω. */
export const EVENT_NAMES: string[] = Object.values(EVENTS);

/** Το snippet που μπαίνει μία φορά στο Base.astro. */
export const TRACK_SNIPPET = `
(function(){
  function send(name, extra){
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, extra || {});
      else (window.dataLayer = window.dataLayer || []).push(Object.assign({event:name}, extra||{}));
    } catch(e){}
  }
  // Δικλείδα: αν κάποιο component βάλει όνομα εκτός λίστας, το βλέπουμε ΤΩΡΑ
  // αντί να το ανακαλύψουμε σε τρεις μήνες ως κενό στην αναφορά.
  var KNOWN = __EVENT_NAMES__;
  function check(name){
    if (KNOWN.indexOf(name) === -1 && location.hostname === 'localhost') {
      console.warn('[track] άγνωστο συμβάν «' + name + '» — πρόσθεσέ το στο lib/track.ts');
    }
    return name;
  }
  document.addEventListener('click', function(e){
    var el = e.target && e.target.closest ? e.target.closest('[data-ev]') : null;
    if (!el) return;
    send(check(el.getAttribute('data-ev')), { ev_page: location.pathname });
  }, { passive: true });
  document.addEventListener('submit', function(e){
    var f = e.target;
    if (f && f.getAttribute && f.getAttribute('data-ev')) {
      send(check(f.getAttribute('data-ev')), { ev_page: location.pathname });
    }
  }, { passive: true });
  window.__track = send;
})();
`.trim().replace('__EVENT_NAMES__', JSON.stringify(Object.values(EVENTS)));
