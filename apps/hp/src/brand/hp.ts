// ═══════════════════════════════════════════════════════════════════════════
// HALKIDIKI PROPERTIES — the values the site used before they were gathered here.
// Moved as they were: this file changes nothing on the page. Open points:
//   · foundedYear 2021 is what the site prints; George decided 2007 (Q-035) — the
//     CMS field overrides it once filled, so it is left as it was.
//   · legalName is the brand name; the registered company is a separate fact that
//     the CMS will carry. Same for the ΓΕΜΗ shown here.
// ═══════════════════════════════════════════════════════════════════════════
import type { Brand } from './types';

export const hp: Brand = {
  key: 'hp',
  name: 'Halkidiki Properties',
  company: {
    legalName: 'Halkidiki Properties',
    gemi: '116495906000',
    foundedYear: 2021,
  },
  address: { street: 'Νέο Ρύσιο', city: 'Θεσσαλονίκη', postalCode: '57001', region: 'Θεσσαλονίκη', country: 'GR' },
  contact: {
    // Format set by George (28/7): «+30 2311 2412 24».
    phoneText: '+30 2311 2412 24',
    phoneHref: 'tel:+302311241224',
    phoneE164: '+302311241224',
    email: 'info@halkidikiproperties.com',
  },
  web: {
    origin: 'https://www.halkidikiproperties.com',
    // The .gr domain is left out on purpose — see lib/seo.ts.
    prodHosts: ['www.halkidikiproperties.com', 'halkidikiproperties.com'],
    mediaOrigin: 'https://media.onsea.gr',
  },
  market: { currency: 'EUR', areaServed: 'Halkidiki, Greece' },
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
