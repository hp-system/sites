// ═══════════════════════════════════════════════════════════════════════════
// HALKIDIKI PROPERTIES — the values the site used before they were gathered here.
// Moved as they were: this file changes nothing on the page. Open points:
//   · foundedYear 2007 and ΓΕΜΗ 158806004000 (GREEK PROPERTIES Μ.Ι.Κ.Ε.) set by George
//     20/10/2026 (Q-035); before that the site printed 2021 and a wrong ΓΕΜΗ.
//   · legalName is the brand name; the registered company name is a separate fact
//     that the CMS will carry.
// ═══════════════════════════════════════════════════════════════════════════
import type { Brand } from './types';

export const hp: Brand = {
  key: 'hp',
  name: 'Halkidiki Properties',
  company: {
    legalName: 'Halkidiki Properties',
    gemi: '158806004000',
    foundedYear: 2007,
  },
  address: { street: 'Νέο Ρύσιο', city: 'Θεσσαλονίκη', postalCode: '57001', region: 'Θεσσαλονίκη', country: 'GR' },
  addressLatin: { street: 'Neo Rysio', city: 'Thessaloniki', country: 'Greece' },
  contact: {
    // Format set by George (28/7): «+30 2311 2412 24».
    phoneText: '+30 2311 2412 24',
    phoneHref: 'tel:+302311241224',
    phoneE164: '+302311241224',
    // WhatsApp / Viber mobile (George 21/10/2026). The live site links wa.me/0030…, which fails.
    mobileText: '+30 698 834 5888',
    whatsappE164: '+306988345888',
    email: 'info@halkidikiproperties.com',
  },
  web: {
    origin: 'https://www.halkidikiproperties.com',
    // The .gr domain is left out on purpose — see lib/seo.ts.
    prodHosts: ['www.halkidikiproperties.com', 'halkidikiproperties.com'],
    mediaOrigin: 'https://media.onsea.gr',
  },
  market: { currency: 'EUR', areaServed: 'Halkidiki, Greece' },
  // The live site's container (rewize.com v21 model, D-140).
  analytics: { gtmId: 'GTM-TF5K9FH', consentCookie: 'site_consent', privacyPath: '/privacy-policy' },
  colors: { primary: '#036dac', secondary: '#a5cf4e' },
  geography: {
    municipalityAliases: {
      'κασσανδρα': 'Κασσάνδρα',            'kassandra': 'Κασσάνδρα',
      'σιθωνια': 'Σιθωνία',                'sithonia': 'Σιθωνία',
      'νεα προποντιδα': 'Νέα Προποντίδα',  'ν προποντιδα': 'Νέα Προποντίδα',
      'nea propontida': 'Νέα Προποντίδα',
      'αριστοτελη': 'Αριστοτέλης',         'aristoteli': 'Αριστοτέλης',
      'πολυγυρο': 'Πολύγυρος',             'polygyro': 'Πολύγυρος',
    },
  },
  // George (28/7): the top property also lets — «rent it» goes to villanatalia.eu.
  rentals: {
    '7010': 'https://www.villanatalia.eu/',
  },
};
