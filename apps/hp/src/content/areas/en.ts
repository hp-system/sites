// ═══════════════════════════════════════════════════════════════════════════
// AREA AND CATEGORY PAGES — /en/property-for-sale/{slug}. English only for now
// (George 20/10/2026: build the whole site in English, translate at the end).
//
// This is brand CONTENT, not code: it is shaped so it can move to the CMS (template
// step T2) without touching the page. Facts come from the live pages of 20/10/2026;
// nothing here is invented, and there is no count of properties anywhere (rule of
// 17/10). Prices on the page are computed from the listing data, not written here.
//
// `q` is the listing query that selects the page's properties (same keys as
// lib/listing.ts `Query`). Villages are GENERAL information: they are never linked
// to a property, and property cards keep showing the municipality only.
// ═══════════════════════════════════════════════════════════════════════════
import type { Query } from '../../lib/listing';
import { redirectFor } from '../../lib/redirects';

export type PriceGroup = {
  label: string;
  /** Which properties the "from €" of this row is computed on. */
  q: Partial<Query>;
};

export type AreaPage = {
  slug: string;
  kind: 'municipality' | 'category';
  /** Short name — breadcrumb, cross-links, "Show properties in …". */
  name: string;
  /** <title>; the brand name is appended by the page. */
  title: string;
  description: string;
  h1: string;
  /** 2–3 sentences above the cards. */
  intro: string;
  /** The longer "About" text lower on the page — one string per paragraph. */
  about: { heading: string; paragraphs: string[] };
  q: Partial<Query>;
  /** Rows of the "from €" guide; a row without data is hidden. */
  prices: PriceGroup[];
  villages?: { group: string; names: string[] }[];
  buying: string;
  faq: { q: string; a: string }[];
};

const BUYING = (place: string) =>
  `Buying in ${place} works like anywhere in Greece: a Greek tax number in one day, an independent lawyer, a pre-contract with a 10% deposit, the notary deed and the land registry. Count 4–8 weeks in total and about 6% on top of the price for taxes and fees.`;

const HOME_ROWS = (municipality: string): PriceGroup[] => [
  { label: 'Houses', q: { municipality, subcategory: 'detached house' } },
  { label: 'Maisonettes', q: { municipality, subcategory: 'maisonette' } },
  { label: 'Apartments', q: { municipality, subcategory: 'apartment' } },
  { label: 'Plots and land', q: { municipality, category: 'land' } },
];

const MUNI_ROWS = (q: Partial<Query>): PriceGroup[] => [
  { label: 'Kassandra', q: { ...q, municipality: 'Κασσάνδρα' } },
  { label: 'Sithonia', q: { ...q, municipality: 'Σιθωνία' } },
  { label: 'Aristotelis', q: { ...q, municipality: 'Αριστοτέλης' } },
  { label: 'Nea Propontida', q: { ...q, municipality: 'Νέα Προποντίδα' } },
];

export const AREA_PAGES: AreaPage[] = [
  // ── MUNICIPALITIES ──────────────────────────────────────────────────────
  {
    slug: 'kassandra', kind: 'municipality', name: 'Kassandra',
    title: 'Property for sale in Kassandra, Halkidiki',
    description: 'Houses, maisonettes, apartments and plots for sale in Kassandra, Halkidiki: Sani, Pefkochori, Hanioti, Kallithea and Possidi. Prices, villages and how buying works.',
    h1: 'Property for sale in Kassandra, Halkidiki',
    intro: 'Kassandra is the first of the three Halkidiki peninsulas and the closest to Thessaloniki, 70–100 km from the airport on a good road. It has the most sandy beaches, the big resorts and villages that live all year, and holiday homes here let well and resell fastest.',
    q: { municipality: 'Κασσάνδρα' },
    prices: HOME_ROWS('Κασσάνδρα'),
    villages: [
      { group: 'East coast · Kassandra gulf', names: ['Afitos', 'Kallithea', 'Kriopigi', 'Polychrono', 'Hanioti', 'Pefkochori'] },
      { group: 'West coast · Toroneos gulf', names: ['Siviri', 'Possidi', 'Kalandra', 'Nea Skioni', 'Loutra'] },
      { group: 'North', names: ['Sani', 'Nea Fokea', 'Nea Potidea', 'Kassandreia'] },
      { group: 'South', names: ['Paliouri', 'Agia Paraskevi'] },
    ],
    about: {
      heading: 'About Kassandra',
      paragraphs: [
        'Kassandra is the westernmost of the three Halkidiki peninsulas and the one most buyers see first. The road from Thessaloniki is a dual carriageway as far as Nea Moudania; Nea Potidea, at the canal that marks the entrance to the peninsula, is about an hour from the airport, and Pefkochori at the southern end about an hour and a half.',
        'The two coasts are different places. The east coast, on the Kassandra gulf, is the busiest beach strip of Halkidiki: Afitos on its cliff, Kallithea, Kriopigi, Polychrono, Hanioti and Pefkochori, with the most rentals in summer. The west coast, on the Toroneos gulf, is quieter and more local: Siviri, Possidi with its sandbar, Kalandra, Nea Skioni and Loutra. In the north are Sani with its marina and resort, Nea Fokea and Nea Potidea; in the south Paliouri and Agia Paraskevi with the thermal springs.',
        'What is for sale here is mostly holiday property: houses in small complexes with shared pools, maisonettes a few hundred metres from the beach, apartments for a first holiday home, villas in Sani and Possidi, and plots inside the villages. Kassandreia, the capital of the peninsula, Nea Fokea, Kallithea and Pefkochori keep schools, shops and doctors open in winter; most beach villages are quiet from November to April.',
        'Kassandra is the strongest rental market in Halkidiki: it has the longest season, the biggest beaches and the easiest access from Thessaloniki. Houses near the beach let for 16 to 20 weeks a year, and when owners decide to sell, homes here are usually the quickest to find a buyer.',
      ],
    },
    buying: BUYING('Kassandra'),
    faq: [
      { q: 'How far is Kassandra from Thessaloniki airport?', a: 'Nea Potidea at the entrance is about 70 km (1 hour); Pefkochori at the south end about 100 km (1 h 30). The road is a dual carriageway as far as Nea Moudania.' },
      { q: 'What do houses cost in Kassandra?', a: 'Apartments start at about €100,000, houses with a garden near the beach from about €200,000, and villas in Sani or Possidi from €600,000.' },
      { q: 'Which villages live all year?', a: 'Kassandreia, Nea Fokea, Kallithea and Pefkochori keep schools, shops and doctors open in winter. Most beach villages are quiet from November to April.' },
      { q: 'Is Kassandra good for renting out?', a: 'It is the strongest rental market in Halkidiki: the longest season, the biggest beaches and the easiest access. Houses near the beach let for 16–20 weeks a year.' },
    ],
  },
  {
    slug: 'sithonia', kind: 'municipality', name: 'Sithonia',
    title: 'Property for sale in Sithonia, Halkidiki',
    description: 'Villas, houses, maisonettes and plots for sale in Sithonia, Halkidiki: Nikiti, Neos Marmaras, Vourvourou, Sarti and Toroni. Prices, villages and how buying works.',
    h1: 'Property for sale in Sithonia, Halkidiki',
    intro: 'Sithonia is the middle peninsula of Halkidiki: pine forests that run down to the sea, small coves, the islands of Vourvourou and the view of Mount Athos across the water. It is quieter and greener than Kassandra and the first choice of buyers who want nature, a sea view and privacy.',
    q: { municipality: 'Σιθωνία' },
    prices: HOME_ROWS('Σιθωνία'),
    villages: [
      { group: 'West coast · Toroneos gulf', names: ['Nikiti', 'Neos Marmaras', 'Porto Carras', 'Toroni', 'Porto Koufo'] },
      { group: 'East coast · facing Athos', names: ['Vourvourou', 'Agios Nikolaos', 'Sarti', 'Kalamitsi'] },
      { group: 'Near the base', names: ['Gerakini', 'Psakoudia', 'Metamorfosi'] },
    ],
    about: {
      heading: 'About Sithonia',
      paragraphs: [
        'Sithonia sits between Kassandra and Mount Athos and is the greenest of the three peninsulas. Pine forest comes down to the water almost everywhere, the coast breaks into small coves rather than long resort beaches, and on the east side the view across the Singitic gulf is Mount Athos itself. It is 95 to 150 km from Thessaloniki airport, from about an hour and a quarter to Nikiti to two hours to Sarti and Toroni.',
        'On the west coast, along the Toroneos gulf, Nikiti is the gateway town that lives all year, then Neos Marmaras with its marina and Porto Carras, and Toroni and Porto Koufo at the tip. On the east coast, facing Athos, are Vourvourou with its lagoon and small islands, Agios Nikolaos, Sarti and Kalamitsi. Gerakini, Psakoudia and Metamorfosi near the base of the peninsula are twenty minutes closer to Thessaloniki.',
        'For sale here are villas with sea views, stone houses in Nikiti and Parthenonas, homes in Neos Marmaras and Vourvourou, and plots with building rights — Sithonia has the largest choice of land in Halkidiki. Building is possible on plots inside the village plans and on fields outside them that meet the minimum area the law requires; we show the building rights of every plot before the viewing.',
        'Nikiti, Neos Marmaras, Agios Nikolaos and Metamorfosi have schools, shops and doctors open in winter. Sarti, Vourvourou and Toroni are summer places, which is exactly why many buyers choose them for a quiet second home.',
      ],
    },
    buying: BUYING('Sithonia'),
    faq: [
      { q: 'How far is Sithonia from Thessaloniki airport?', a: 'Nikiti is about 95 km (1 h 15); Neos Marmaras 110 km; Vourvourou 120 km; Sarti and Toroni 140–150 km (2 hours).' },
      { q: 'What do properties cost in Sithonia?', a: 'Plots start at about €100,000, houses from about €200,000 and sea-view villas from €500,000.' },
      { q: 'Which villages live all year?', a: 'Nikiti, Neos Marmaras, Agios Nikolaos and Metamorfosi have schools, shops and doctors open in winter. Sarti, Vourvourou and Toroni are summer places.' },
      { q: 'Can I build on land in Sithonia?', a: 'Yes, on plots inside the village plans and on fields outside with the minimum area the law requires. We show the building rights of every plot before the viewing.' },
    ],
  },
  {
    slug: 'aristotelis', kind: 'municipality', name: 'Aristotelis',
    title: 'Property for sale in Aristotelis, eastern Halkidiki',
    description: 'Houses, plots and fields for sale in Aristotelis, eastern Halkidiki: Ierissos, Nea Roda, Ouranoupoli, Ammouliani, Olympiada and Arnaia. Prices, villages and how buying works.',
    h1: 'Property for sale in Aristotelis, eastern Halkidiki',
    intro: 'The municipality of Aristotelis is eastern Halkidiki, on the side of Mount Athos: the coast from Pyrgadikia to Ierissos and Ouranoupoli, the island of Ammouliani, the bays of Olympiada and Stratoni, and the mountain town of Arnaia. Fewer tourists, long beaches, the lowest prices per square metre in Halkidiki and the largest plots.',
    q: { municipality: 'Αριστοτέλης' },
    prices: HOME_ROWS('Αριστοτέλης'),
    villages: [
      { group: 'Athos coast', names: ['Ierissos', 'Nea Roda', 'Tripiti', 'Ouranoupoli', 'Ammouliani island'] },
      { group: 'Singitic gulf', names: ['Pyrgadikia'] },
      { group: 'Strymonian gulf', names: ['Olympiada', 'Stratoni'] },
      { group: 'Inland', names: ['Arnaia'] },
    ],
    about: {
      heading: 'About Aristotelis',
      paragraphs: [
        'Aristotelis covers the eastern side of Halkidiki, up to the border of Mount Athos. It is 100 to 150 km from Thessaloniki airport — Olympiada and Arnaia about 85–100 km, Ierissos 110 km, Pyrgadikia 120 km and Ouranoupoli 130 km — so count an hour and a half to two hours by car.',
        'Pyrgadikia is a fishing village on the Singitic gulf. Ierissos and Nea Roda are the towns of the Athos canal area and both live all year. Ammouliani, ten minutes by ferry from Tripiti, is the only inhabited island of Halkidiki, with sandy beaches, tavernas, a school and a year-round village. Ouranoupoli is the last village before Mount Athos and the port for the ferries to the monasteries, and Arnaia is a stone-built mountain town at 600 metres. On the Strymonian gulf are the bays of Olympiada and Stratoni.',
        'This side of Halkidiki has less tourism, fewer foreign buyers so far and longer distances, so for the same budget you get a larger house or plot than in Kassandra, often with a sea view. For sale are plots and fields with sea views, houses in Ierissos and Nea Roda, homes on Ammouliani island and in Pyrgadikia.',
        'Mount Athos itself is a self-governed monastic state and its land is not for sale. Men with a permit take the ferry from Ouranoupoli; everyone else can see the Athos coast on the boat trips from Ouranoupoli and Ormos Panagias.',
      ],
    },
    buying: BUYING('Aristotelis'),
    faq: [
      { q: 'How far is Aristotelis from Thessaloniki airport?', a: 'Olympiada and Arnaia are about 85–100 km; Ierissos 110 km; Ouranoupoli 130 km; Pyrgadikia 120 km. Count 1 h 30 to 2 hours.' },
      { q: 'Why are prices lower here?', a: 'Less tourism, fewer foreign buyers so far and bigger distances. For the same budget you get a larger house or plot than in Kassandra, often with a sea view.' },
      { q: 'Is Ammouliani a good place for a home?', a: 'Yes for buyers who like island life ten minutes from the mainland: sandy beaches, tavernas, a school and a ferry every 20 minutes in summer.' },
      { q: 'Can I buy on Mount Athos?', a: 'No. Mount Athos is a self-governed monastic state and its land is not for sale. Ouranoupoli is the last village with homes for sale.' },
    ],
  },
  {
    slug: 'nea-propontida', kind: 'municipality', name: 'Nea Propontida',
    title: 'Property for sale in Nea Propontida, Halkidiki',
    description: 'Apartments, maisonettes, houses and plots for sale in Nea Propontida, Halkidiki: Nea Kallikratia, Nea Moudania, Flogita and Sozopoli. Prices, villages and how buying works.',
    h1: 'Property for sale in Nea Propontida, Halkidiki',
    intro: 'Nea Propontida is the part of Halkidiki closest to Thessaloniki: 40–60 km from the airport, 35 minutes from the city. It is the best choice for a permanent home or for weekends from Thessaloniki, with services open all year and a long sandy coast on the Thermaic gulf.',
    q: { municipality: 'Νέα Προποντίδα' },
    prices: HOME_ROWS('Νέα Προποντίδα'),
    villages: [
      { group: 'Coast', names: ['Nea Kallikratia', 'Nea Moudania', 'Flogita', 'Paralia Dionysiou', 'Sozopoli', 'Nea Iraklia', 'Nea Plagia'] },
      { group: 'Inland', names: ['Agios Mamas', 'Nea Triglia'] },
    ],
    about: {
      heading: 'About Nea Propontida',
      paragraphs: [
        'Nea Propontida is the western, mainland part of Halkidiki and the closest to Thessaloniki. Nea Kallikratia is 40 km from the airport and Nea Moudania 60 km, 35 to 50 minutes on the motorway, and many owners commute to the city.',
        'Nea Moudania is the market town of Halkidiki, with the hospital, schools, shops that stay open all year and the port for Sithonia. Nea Kallikratia, 40 km from Thessaloniki, is a town with a long beach and a weekly market. Flogita, Sozopoli, Nea Iraklia and Nea Plagia line a long sandy coast facing the Thermaic gulf, with Agios Mamas and Nea Triglia inland.',
        'This is the most practical part of Halkidiki for living all year: hospital, schools, shops and public transport run in every season, and the beach is a few minutes away. For sale are apartments and maisonettes in Nea Kallikratia and Nea Moudania, houses in Flogita and Sozopoli, and plots near the sea — at prices lower than on the two peninsulas.',
        'The beaches here are long, sandy, shallow and family-friendly, and the famous beaches of Kassandra and Sithonia are 30 to 40 minutes away.',
      ],
    },
    buying: BUYING('Nea Propontida'),
    faq: [
      { q: 'How far is Nea Propontida from Thessaloniki?', a: 'Nea Kallikratia is 40 km from the airport, Nea Moudania 60 km; 35–50 minutes on the motorway. Many owners commute to Thessaloniki.' },
      { q: 'Is it a good area for a permanent home?', a: 'The best in Halkidiki: hospital, schools, shops and public transport all year, and the beach a few minutes away. Prices are lower than on the two peninsulas.' },
      { q: 'What do properties cost in Nea Propontida?', a: 'Apartments and maisonettes from about €105,000, houses with a garden from about €200,000. Plots near the sea from about €100,000.' },
      { q: 'Are the beaches good?', a: 'Long sandy beaches on the Thermaic gulf, shallow and family-friendly; Sithonia and Kassandra are 30–40 minutes away.' },
    ],
  },
  {
    slug: 'polygyros', kind: 'municipality', name: 'Polygyros',
    title: 'Property for sale in Polygyros, Halkidiki',
    description: 'Property for sale in Polygyros, the capital of Halkidiki, and the beach villages of Gerakini and Psakoudia. Villages and how buying works.',
    h1: 'Property for sale in Polygyros, Halkidiki',
    intro: 'Polygyros is the administrative capital of Halkidiki, a mountain town among pine and olive groves, with the beach villages of Gerakini and Psakoudia on the gulf below. Services stay open all year and the coast is a short drive away.',
    q: { municipality: 'Πολύγυρος' },
    prices: HOME_ROWS('Πολύγυρος'),
    villages: [
      { group: 'Coast', names: ['Gerakini', 'Psakoudia'] },
      { group: 'Inland', names: ['Polygyros', 'Taxiarchis', 'Paleochora', 'Agios Prodromos', 'Kalyves'] },
    ],
    about: {
      heading: 'About Polygyros',
      paragraphs: [
        'Polygyros is the capital of the regional unit of Halkidiki, built on the hills among pine and olive groves. The regional offices and the courts are here, so the town keeps its services open in every season.',
        'Below the town, on the gulf, are the beach villages of Gerakini and Psakoudia near the base of Sithonia; inland are Taxiarchis, Paleochora, Agios Prodromos and Kalyves.',
      ],
    },
    buying: BUYING('Polygyros'),
    faq: [
      { q: 'Is Polygyros good for a year-round home?', a: 'It is the regional capital, with services open all year, and the beaches of Gerakini and Psakoudia are a short drive away.' },
    ],
  },

  // ── CATEGORIES ──────────────────────────────────────────────────────────
  {
    slug: 'villas', kind: 'category', name: 'Villas',
    title: 'Villas for sale in Halkidiki',
    description: 'Villas and detached houses for sale in Halkidiki: sea-view villas in Kassandra and Sithonia, estates near Mount Athos and family homes close to Thessaloniki.',
    h1: 'Villas for sale in Halkidiki',
    intro: 'Detached villas across the municipalities of Halkidiki: sea-view houses in Kassandra and Sithonia, quieter estates near Mount Athos and family homes close to Thessaloniki in Nea Propontida. Each listing shows the facts a buyer asks first: plot size, distance to the sea and pool.',
    q: { subcategory: 'detached house' },
    prices: MUNI_ROWS({ subcategory: 'detached house' }),
    about: {
      heading: 'About villas in Halkidiki',
      paragraphs: [
        'Most villas for sale in Halkidiki are on the two western peninsulas. In Kassandra they are close to the big beaches and the resorts of Sani, Possidi and Pefkochori, where a house near the sea lets for 16 to 20 weeks a year. In Sithonia they sit among the pines above small coves, often with a view of Mount Athos.',
        'In Aristotelis, on the eastern side, the same budget buys a larger house or plot, often with a sea view. Nea Propontida, 40 to 60 km from Thessaloniki airport, is the choice for a family home used all year.',
        'Buying from abroad is common: you need a Greek tax number and a lawyer, viewings can be in person or by video call, and the deed can be signed with a power of attorney.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'What does a villa in Halkidiki cost?', a: 'Detached houses start at about €200,000 near Thessaloniki; sea-view villas on Kassandra and Sithonia usually start at €500,000.' },
      { q: 'Can a villa pay for itself with rentals?', a: 'Near the beach, villas let for 16–20 weeks a year in Kassandra, the strongest rental market in Halkidiki.' },
      { q: 'Can I buy a villa from abroad?', a: 'Yes. You need a Greek tax number and a lawyer; viewings can be in person or by video call, and the deed can be signed with a power of attorney.' },
    ],
  },
  {
    slug: 'apartments', kind: 'category', name: 'Apartments',
    title: 'Apartments for sale in Halkidiki',
    description: 'Apartments for sale in Halkidiki: a first holiday home in Kassandra or a year-round flat in Nea Moudania and Nea Kallikratia.',
    h1: 'Apartments for sale in Halkidiki',
    intro: 'Apartments are the most affordable way to own a home in Halkidiki: a first holiday home in Kassandra, or a flat for the whole year in Nea Moudania and Nea Kallikratia, 40–60 km from Thessaloniki.',
    q: { subcategory: 'apartment' },
    prices: MUNI_ROWS({ subcategory: 'apartment' }),
    about: {
      heading: 'About apartments in Halkidiki',
      paragraphs: [
        'In Kassandra, apartments start at about €100,000 and are the usual first holiday home. In Nea Propontida, the part of Halkidiki closest to Thessaloniki, apartments and maisonettes start at about €105,000 in Nea Kallikratia and Nea Moudania, towns with services open all year.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'Where are apartments cheapest?', a: 'In Kassandra and Nea Propontida, from about €100,000–105,000.' },
    ],
  },
  {
    slug: 'maisonettes', kind: 'category', name: 'Maisonettes',
    title: 'Maisonettes for sale in Halkidiki',
    description: 'Maisonettes for sale in Halkidiki, many in small complexes with shared pools a few hundred metres from the beach.',
    h1: 'Maisonettes for sale in Halkidiki',
    intro: 'Maisonettes are the classic Halkidiki holiday home: two levels, a garden or a balcony, often in a small complex with a shared pool a few hundred metres from the beach.',
    q: { subcategory: 'maisonette' },
    prices: MUNI_ROWS({ subcategory: 'maisonette' }),
    about: {
      heading: 'About maisonettes in Halkidiki',
      paragraphs: [
        'In Kassandra many maisonettes are 300 metres from the beach; in Nea Propontida they are a year-round choice close to Thessaloniki. Near the beach in Kassandra they let well from May to October.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'Are maisonettes good for rentals?', a: 'Yes: near the beach they let well in summer, especially in Kassandra, the strongest rental market in Halkidiki.' },
    ],
  },
  {
    slug: 'houses', kind: 'category', name: 'Houses',
    title: 'Houses for sale in Halkidiki',
    description: 'Houses and homes for sale in Halkidiki: villas, maisonettes and apartments in Kassandra, Sithonia, Aristotelis and Nea Propontida.',
    h1: 'Houses for sale in Halkidiki',
    intro: 'Every kind of home in Halkidiki in one place: villas, maisonettes and apartments in Kassandra, Sithonia, Aristotelis and Nea Propontida, for holidays or for the whole year.',
    q: { category: 'residency' },
    prices: MUNI_ROWS({ category: 'residency' }),
    about: {
      heading: 'About homes in Halkidiki',
      paragraphs: [
        'Kassandra has the most rentals and the fastest resales, Sithonia the most nature and privacy, Aristotelis the lowest prices per square metre and Nea Propontida the best services for living all year, 40–60 km from Thessaloniki.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'Which part of Halkidiki is best for living all year?', a: 'Nea Propontida: hospital, schools, shops and public transport all year, and the beach a few minutes away.' },
    ],
  },
  {
    slug: 'land', kind: 'category', name: 'Land',
    title: 'Land for sale in Halkidiki',
    description: 'Plots and fields for sale in Halkidiki: building plots inside the villages and fields with sea views in Sithonia and Aristotelis.',
    h1: 'Land for sale in Halkidiki',
    intro: 'Plots inside the village plans and fields outside them, from Kassandra to the Athos coast. Sithonia has the largest choice of land in Halkidiki and Aristotelis the largest plots.',
    q: { category: 'land' },
    prices: MUNI_ROWS({ category: 'land' }),
    about: {
      heading: 'About buying land in Halkidiki',
      paragraphs: [
        'Building is possible on plots inside the village plans and on fields outside them that meet the minimum area the law requires. We show the building rights of every plot before the viewing.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'Can I build on land in Halkidiki?', a: 'Yes, on plots inside the village plans and on fields outside with the minimum area the law requires. We show the building rights of every plot before the viewing.' },
    ],
  },
  {
    slug: 'plots', kind: 'category', name: 'Plots',
    title: 'Building plots for sale in Halkidiki',
    description: 'Building plots for sale inside the villages of Halkidiki, close to the sea and to services.',
    h1: 'Building plots for sale in Halkidiki',
    intro: 'Building plots inside the village plans of Halkidiki, close to the sea and to services, with the building rights shown before the viewing.',
    q: { subcategory: 'plot' },
    prices: MUNI_ROWS({ subcategory: 'plot' }),
    about: {
      heading: 'About building plots',
      paragraphs: [
        'Plots inside the village plans can be built on according to the rules of each village. We show the building rights of every plot before the viewing.',
      ],
    },
    buying: BUYING('Halkidiki'),
    faq: [
      { q: 'What can I build on a plot?', a: 'It depends on the rules of each village plan; we show the building rights of every plot before the viewing.' },
    ],
  },
  {
    slug: 'hotels', kind: 'category', name: 'Hotels',
    title: 'Hotels for sale in Halkidiki',
    description: 'Hotels and tourist businesses for sale in Halkidiki.',
    h1: 'Hotels for sale in Halkidiki',
    intro: 'Hotels and tourist businesses for sale in Halkidiki. Ask an adviser for the full file of each one.',
    q: { subcategory: 'hotel' },
    prices: MUNI_ROWS({ subcategory: 'hotel' }),
    about: {
      heading: 'About hotels for sale',
      paragraphs: [],
    },
    buying: BUYING('Halkidiki'),
    faq: [],
  },
];

export function areaPage(slug: string): AreaPage | undefined {
  const s = slug.toLowerCase();
  return AREA_PAGES.find((p) => p.slug === s);
}

/** The page URL — English only for now. */
/** The old area page's own path (its route, its canonical). */
export function areaPath(slug: string): string {
  return `/en/property-for-sale/${slug}`;
}

/** Where a link to this area goes: the final address (#152). D1 moved the area pages to the
 *  spec pages (/en/properties/<area>); a link never makes Google follow a redirect hop. */
export function areaUrl(slug: string): string {
  const own = areaPath(slug);
  const r = redirectFor(own);
  return r?.status === 301 ? r.to : own;
}
