// ═══════════════════════════════════════════════════════════════════════════
// ΣΤΟΙΧΕΙΑ ΕΤΑΙΡΕΙΑΣ — από το CMS, με τις σημερινές τιμές ως ΔΙΧΤΥ.
//
// Η συνεδρία EALIDA έφτιαξε το `GET /site/company?site=hp` (5/8) και μαζί έστειλε
// τη σωστή προειδοποίηση:
//
//   «Όλες οι τιμές είναι ΚΕΝΕΣ αυτή τη στιγμή. Αν συνδέσεις χωρίς εφεδρεία, το
//    τηλέφωνο εξαφανίζεται από τρία σημεία της αρχικής ΚΑΙ από τα δομημένα
//    δεδομένα της Google.»
//
// Επαληθεύτηκε: το endpoint απαντά 200 με ΟΛΑ τα πεδία κενά.
//
// 🛡️ ΓΙ' ΑΥΤΟ ΤΟ ΚΕΝΟ ΔΕΝ ΘΕΩΡΕΙΤΑΙ ΤΙΜΗ. Κάθε πεδίο περνά από `pick()`: αν το
//    CMS δώσει κενό ή πέσει το API, μένει η σημερινή σταθερά. Το site ΔΕΝ αλλάζει
//    σήμερα — αλλάζει τη στιγμή που ο George συμπληρώσει το πεδίο, χωρίς deploy.
//    ⛔ ΜΗΝ αφαιρέσεις τις σταθερές από το contact.ts «για καθαριότητα» πριν
//       συμπληρωθούν ΟΛΑ. Είναι το μόνο που κρατά το τηλέφωνο στη σελίδα.
// ═══════════════════════════════════════════════════════════════════════════
import { PHONE_TEXT, PHONE_HREF, PHONE_E164, EMAIL } from './contact';
import { brand } from '../brand/index';

const API = import.meta.env.EALIDA_API || process.env.EALIDA_API || 'http://localhost:3020/api';

export type Company = {
  phone: string; phoneHref: string; phoneE164: string;
  /** Κινητό εξυπηρέτησης για WhatsApp. ΚΕΝΟ ⇒ πέφτει στο `phone`. */
  whatsappE164: string;
  email: string; legalName: string; gemi: string;
  street: string; city: string; postalCode: string; region: string;
  foundedYear: number;
  /** Το ΤΡΕΧΟΝ έτος — υπολογίζεται εδώ, ΔΕΝ έρχεται από το CMS. */
  year: number;
};

// Οι σημερινές τιμές, όπως είναι γραμμένες στη σελίδα σήμερα.
const FALLBACK = {
  legalName: brand.company.legalName,
  gemi: brand.company.gemi,
  street: brand.address.street, city: brand.address.city,
  postalCode: brand.address.postalCode, region: brand.address.region,
  foundedYear: brand.company.foundedYear,
} as const;

type Raw = Partial<Record<
  'phone' | 'whatsapp' | 'email' | 'legalName' | 'gemi' | 'street' | 'city' | 'postalCode' | 'region', string
>> & { foundedYear?: number | null };

let cache: { at: number; raw: Raw } | null = null;
const TTL = 60_000;                       // ένα λεπτό — οι αλλαγές CMS ισχύουν σχεδόν αμέσως
let inflight: Promise<Raw> | null = null;

async function load(): Promise<Raw> {
  if (cache && Date.now() - cache.at < TTL) return cache.raw;
  if (inflight) return inflight;
  inflight = fetch(`${API}/site/company?site=${brand.key}`, { signal: AbortSignal.timeout(4000) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => {
      const raw: Raw = (j && j.company) || {};
      cache = { at: Date.now(), raw };
      return raw;
    })
    .catch(() => {
      // 🛡️ Το API κάτω ΔΕΝ σβήνει το τηλέφωνο. Κρατάμε ό,τι είχαμε· αν δεν είχαμε
      //    ποτέ, γυρίζουμε κενό και αναλαμβάνει το `pick()` παρακάτω.
      return cache?.raw ?? {};
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Κενό, κενά διαστήματα ή `null` σημαίνουν «δεν δηλώθηκε» — ΠΟΤΕ «σβήσ' το». */
const pick = (v: unknown, fb: string): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fb;
};

/** «+30 2311 2412 24» → «+302311241224». Κρατά ΜΟΝΟ ψηφία και το αρχικό «+». */
function e164(display: string): string {
  const d = display.replace(/[^\d+]/g, '');
  return d.startsWith('+') ? '+' + d.slice(1).replace(/\D/g, '') : d.replace(/\D/g, '');
}

export async function company(): Promise<Company> {
  const raw = await load();
  const phone = pick(raw.phone, PHONE_TEXT);
  // Το href και το E164 ΠΑΡΑΓΟΝΤΑΙ από το κείμενο — αλλιώς, όταν ο George αλλάξει
  // τον αριθμό, η σελίδα θα έδειχνε τον νέο και θα καλούσε τον παλιό.
  const derived = e164(phone);
  const yr = Number(raw.foundedYear);
  // 📱 ΤΟ WHATSAPP ΕΙΝΑΙ ΞΕΧΩΡΙΣΤΟΣ ΑΡΙΘΜΟΣ — ο George το ζήτησε ρητά: το κινητό
  //    εξυπηρέτησης, «και όταν είμαστε κλειστά θα εξυπηρετείται με το AI».
  //    ⚠️ Το πεδίο ΔΕΝ υπάρχει ακόμα στο ανεπτυγμένο API (ελέγχθηκε στο box 5/8),
  //       γι' αυτό διαβάζεται προαιρετικά: όταν φτάσει, ανάβει μόνο του.
  //    Κενό ⇒ σταθερό τηλέφωνο, ακριβώς όπως σήμερα.
  const wa = e164(pick(raw.whatsapp, ''));
  return {
    phone,
    whatsappE164: wa || derived || PHONE_E164,
    phoneHref: derived ? `tel:${derived}` : PHONE_HREF,
    phoneE164: derived || PHONE_E164,
    email: pick(raw.email, EMAIL),
    legalName: pick(raw.legalName, FALLBACK.legalName),
    gemi: pick(raw.gemi, FALLBACK.gemi),
    street: pick(raw.street, FALLBACK.street),
    city: pick(raw.city, FALLBACK.city),
    postalCode: pick(raw.postalCode, FALLBACK.postalCode),
    region: pick(raw.region, FALLBACK.region),
    foundedYear: Number.isFinite(yr) && yr > 1900 ? yr : FALLBACK.foundedYear,
    // 🪤 ΤΟ ΤΡΕΧΟΝ ΕΤΟΣ ΗΤΑΝ ΚΑΡΦΩΤΟ (`const year = 2026` στο Footer).
    //    Την 1η Ιανουαρίου το υποσέλιδο θα έγραφε περασμένη χρονιά — σε ΚΑΘΕ
    //    σελίδα, σε 9 γλώσσες, και κανείς δεν θα το πρόσεχε για μήνες.
    //    Δεν έρχεται από το CMS: από εκεί παίρνουμε μόνο το έτος ΕΝΑΡΞΗΣ.
    year: new Date().getFullYear(),
  };
}
