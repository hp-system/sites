// ═══════════════════════════════════════════════════════════════════════════
// ΤΟ ΚΕΙΜΕΝΟ ΤΩΝ ΣΕΛΙΔΩΝ — ΔΕΝ ΤΟ ΓΡΑΨΑΜΕ ΕΜΕΙΣ.
//
// 📄 ΠΗΓΗ: το **σημερινό** halkidikiproperties.com (Laravel, Hetzner) — τραβήχτηκε
//    ζωντανά στις 06/08/2026 από τις ίδιες τις σελίδες και τα `resources/lang/*`.
//    Είναι κείμενο **της εταιρείας**, εγκεκριμένο και δημοσιευμένο εδώ και χρόνια.
//    Μεταφέρθηκε αυτούσιο: ίδιες λέξεις, ίδια σειρά. Αφαιρέθηκαν μόνο τα σκουπίδια
//    πλοήγησης (breadcrumbs, κουμπιά, επαναλήψεις τίτλων).
//
// 🚫 ΤΙΠΟΤΑ ΔΕΝ ΕΠΙΝΟΗΘΗΚΕ ΚΑΙ ΤΙΠΟΤΑ ΔΕΝ ΜΕΤΑΦΡΑΣΤΗΚΕ. Ό,τι λείπει από την πηγή,
//    λείπει και εδώ. Τα ορθογραφικά και τα λάθη της πηγής **διατηρήθηκαν** («sic»):
//    «Κυριακή: Closed», «επιτυχημένεη», «achive your your», «Υπηρεσιες» χωρίς τόνο,
//    «Sell your property with us.The number one…», «ιδιοτικότητα». Αν καθαριστούν,
//    καθαρίζονται με **απόφαση ανθρώπου**, όχι σιωπηλά εδώ.
//
// 🌍 ΓΛΩΣΣΕΣ: το παλιό site έχει **5 ενεργές** (el, en, de, sr, bg) — όχι 9. Κείμενα
//    de/sr/bg βρέθηκαν **μόνο** για το `/about` (ζουν σε lang αρχεία)· των υπολοίπων
//    σελίδων ζουν στη βάση του Laravel και δεν τραβήχτηκαν. Για `ro/tr/he/ru` δεν
//    υπάρχει **κανένα** κείμενο πουθενά. Όπου λείπει γλώσσα, το `pageContent()`
//    πέφτει στα αγγλικά — αυτό είναι η σωστή συμπεριφορά, όχι κενό.
//
// ⛔ ΔΕΝ ΜΠΑΙΝΟΥΝ ΕΔΩ: `halkidiki` (στο παλιό site είναι **εξωτερικό** site,
//    experience.halkidikiproperties.com) και `team` (η route είναι σχολιασμένη —
//    404 και στο παλιό). Χωρίς δικό τους κείμενο, δεν γίνονται σελίδες.
//
// 🪤 ΤΑ ΝΟΥΜΕΡΑ ΤΟΥ «Γιατί Halkidiki Properties;» (1.000.000+ προβολές, 5.000+
//    ακίνητα, 30.000+ πελάτες…) ΔΕΝ μεταφέρθηκαν: είναι του παλιού site και δεν
//    έχουν επαληθευτεί από τη βάση. Μπαίνουν μόνο αφού μετρηθούν.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from './i18n';
import type { PageContent, PageKey } from './pages';

export const CONTENT: Partial<Record<PageKey, Partial<Record<Lang, PageContent>>>> = {
  // ── /about ────────────────────────────────────────────────────────────────
  // Παλιά: /el/about-us · /en/about-us · /de/uber-uns · /sr/about-us · /bg/about-us
  about: {
    el: {
      title: `Σχετικά με την Halkidiki Properties`,
      h1: `Σχετικά με την Halkidiki Properties`,
      lead: `Κατέχοντας τη μεγαλύτερη βάση ακινήτων της Χαλκιδικής, σε συνδυασμό με την πολυετή εμπειρία και γνώση των στελεχών μας, η Halkidiki Properties καταφέρνει να ανταποκρίνεται στις επιθυμίες κάθε πελάτη.`,
      blocks: [
        {
          kind: 'text',
          h: `Σχετικά με εμάς`,
          p: [
            `Με τη μοναδική προώθηση των ακινήτων και την εφαρμογή καινοτόμων τεχνολογιών τεχνητής νοημοσύνης σε κάθε διαδικασία, επιτυγχάνεται το ταχύτερο και ακριβέστερο ταίριασμα αγοραστή-ακινήτου.`,
            `Όσον αφορά τις επενδυτικές ευκαιρίες, το εξειδικευμένο τμήμα μας έχει αναλάβει και διεκπεραιώσει επιτυχώς σημαντικά και πολυάριθμα projects, καθιστώντας την εταιρία μας ως την πλέον αξιόπιστη για επενδυτές.`,
          ],
        },
        {
          kind: 'list',
          items: [
            { t: `Αξίες`, d: `Καθώς η ομάδα μας έχει μεγαλώσει, καθίσταται όλο και πιο σημαντικό να εντοπίζουμε και να περιγράφουμε τις βασικές αξίες που καθοδηγούν αυτό που κάνουμε. Οι βασικές μας αξίες αναπτύσσουν και καθορίζουν τον πολιτισμό μας, την επωνυμία μας, τις επιχειρηματικές μας στρατηγικές και ποιοι είμαστε ως επαγγελματίες στον σημερινό εταιρικό κόσμο.` },
            { t: `Η ιστορία μας`, d: `Η ιδέα ανάπτυξης μιας εταιρείας real estate, στην οποία οι πελάτες θα απολαμβάνουν υψηλού επιπέδου υπηρεσίες, ξεκινά στην εποχή που η τεχνολογία κάνει τα πρώτα της δειλά βήματα στον κλάδο.` },
            { t: `Φιλοσοφία`, d: `Δεκάδες φίλοι, οικογένειες και θεσμικοί επενδυτές τόσο από το εσωτερικό όσο και από το εξωτερικό, μας έχουν εμπιστευτεί την πραγματοποιήση των ονείρων τους. Αυτό επιτυγχάνεται χάρις στο ισχυρό ομαδικό μας πνεύμα, την μεθοδική εργασία και την άριστη οργάνωση του νεότερου ομίλου Real Estate στη χώρα μας` },
            { t: `Εταιρική Κοινωνική Ευθύνη`, d: `Ενθαρρύνουμε μια ανοιχτή και υποστηρικτική εταιρική κουλτούρα, στην οποία κάθε άτομο είναι σεβαστό, βοηθάμε τους ανθρώπους μας να εξελιχθούν μέσω της κατάλληλης εκπαίδευσης και ανάπτυξης, μοιραζόμαστε την επιτυχία και το επίτευγμα ανταμοιβής και αναγνωρίζουμε ότι τα διαφορετικά δυνατά σημεία του κάθε μέλους μας σε συνδυασμό με την αρμονική ομαδική εργασία παράγουν τα καλύτερα αποτελέσματα.` },
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `About Halkidiki Properties`,
      h1: `About Halkidiki Properties`,
      lead: `With the largest property database of Halkidiki in our hands, combined with the multiannual experience and knowledge of our personnel, Halkidiki Properties manages to respond to any client's desires.`,
      blocks: [
        {
          kind: 'text',
          h: `About us`,
          p: [
            `The unique promotion of properties and the application of brand-new artificial intelligence technologies in each procedure, leads to the fastest and most accurate matching between buyers and properties.`,
            `In terms of investment opportunities, our specialized department has undertaken and successfully completed numerous significant projects, making our company the most reliable for investors.`,
          ],
        },
        {
          kind: 'list',
          items: [
            { t: `Values`, d: `As our team grows, it becomes increasingly important to identify and describe the core values that guide what we do. Our core values develop and define our culture, our brand, our business strategies and who we are as professionals in today's corporate world.` },
            { t: `Our Story`, d: `The idea of developing a real estate company, in which customers will enjoy a high level of services, begins at a time when technology is making its first timid steps in the industry.` },
            { t: `Philosophy`, d: `Dozens of friends, families and institutional investors, both at home and abroad, have entrusted us with realizing their dreams. This is achieved thanks to our strong team spirit, methodical work and excellent organization of the newest Real Estate group in our country.` },
            { t: `Company's Social Responsibility`, d: `We encourage an open and supportive corporate culture, in which everyone is respected, we help our people to evolve through appropriate training and development, we share the success and achievement of reward and we recognize that each member's different strengths in combination with harmonious teamwork produce the best results.` },
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
    // 🪤 DE: το σώμα του κειμένου είναι **ΣΤΑ ΑΓΓΛΙΚΑ** και στο ζωντανό γερμανικό
    //    site — το `section_desc` του `lang/de/aboutUs.php` έμεινε αμετάφραστο.
    //    Μεταφέρεται όπως είναι. Οι περιγραφές των 4 καρτών στα γερμανικά υπάρχουν
    //    στο lang αρχείο αλλά δεν τραβήχτηκαν — λείπουν, δεν επινοούνται.
    de: {
      title: `Über Halkidiki Properties`,
      h1: `Über uns`,
      lead: `With the largest property database of Halkidiki in our hands, combined with the multiannual experience and knowledge of our personnel, Halkidiki Properties manages to respond to any client's desires.`,
      blocks: [
        {
          kind: 'text',
          p: [
            `The unique promotion of properties and the application of brand-new artificial intelligence technologies in each procedure, leads to the fastest and most accurate matching between buyers and properties.`,
            `In terms of investment opportunities, our specialized department has undertaken and successfully completed numerous significant projects, making our company the most reliable for investors.`,
          ],
        },
        {
          kind: 'list',
          items: [
            { t: `Werte` },
            { t: `Unsere Geschichte` },
            { t: `Philosophie` },
            { t: `Soziale Verantwortung von Unternehmen` },
          ],
        },
      ],
      cta: { label: `Kontakt`, to: 'phone' },
    },
    // 🪤 SR: ο `meta_title` της πηγής είναι «Halkdiki Properties nama» — τυπογραφικό
    //    στο ίδιο το ζωντανό site. Μεταφέρεται αυτούσιο.
    sr: {
      title: `Halkdiki Properties nama`,
      h1: `O nama`,
      lead: `Sa najvećom bazom podataka na Halkidikiju u našim rukama, kombinovano sa višegodišnjim iskustvom i znanjem našeg tima, Halkidiki Properties uspeva da odgovori na svaku želju klijenta.`,
      blocks: [
        {
          kind: 'text',
          p: [
            `Jedinstvena promocija nekretnina i primena potpuno nove tehnologije veštačke inteligencije u svakom postpupku vode do najbržeg i najtačnijeg podudaranja između kupaca i nekretnine.`,
            `Što se tiče mogućnosti ulaganja, naše specijalizovano odeljenje je preduzelo i uspešno završilo brojne značajne projekte, čineći našu kompaniju najpouzdanijom za investitore.`,
          ],
        },
        {
          kind: 'list',
          items: [
            { t: `Vrednosti` },
            { t: `Naša Istorija` },
            { t: `Filozofija` },
            { t: `Društvena Odgovornost Kompanije` },
          ],
        },
      ],
      cta: { label: `Kontakt`, to: 'phone' },
    },
    bg: {
      title: `За Halkidiki Properties`,
      h1: `За нас`,
      lead: `С най-голямата база данни за имоти на Халкидики в нашите ръце, съчетана с многогодишния опит и знания на нашия персонал, Халкидики Пропъртис успява да отговори на желанията на всеки клиент.`,
      blocks: [
        {
          kind: 'text',
          p: [
            `Уникалното популяризиране на имоти и прилагането на чисто нови технологии за изкуствен интелект във всяка процедура, води до най-бързото и точно съвпадение между купувачи и имоти.`,
            `По отношение на възможностите за инвестиции, нашият специализиран отдел е предприел и успешно е изпълнил множество значими проекти, правейки нашата компания най-надеждната за инвеститорите.`,
          ],
        },
        {
          kind: 'list',
          items: [
            { t: `Стойности` },
            { t: `Нашата история` },
            { t: `Философия` },
            { t: `Корпоративна социална отговорност` },
          ],
        },
      ],
      cta: { label: `Контакти`, to: 'phone' },
    },
  },

  // ── /contact ──────────────────────────────────────────────────────────────
  // Παλιά: /el/επικοινωνια · /en/contact · /de/kontact · /sr/kontakt · /bg/контакт
  // 🪤 Η αριστερή στήλη (διεύθυνση, τηλέφωνα, ωράριο) ΔΕΝ είναι σε lang αρχείο —
  //    είναι serialized PHP στη `static_pages.page_config` (route_id='contact').
  //    Αν αλλάξει εκεί, αυτά εδώ παλιώνουν σιωπηλά.
  contact: {
    el: {
      title: `Halkidiki Properties | Επικοινωνία`,
      h1: `Επικοινωνήστε με τη Halkidiki Properties`,
      lead: `Είμαστε έτοιμοι να σας καθοδηγήσουμε σε οποιαδήποτε διαδικασία είτε εάν ενδιαφέρεστε να αγοράσετε είτε να πουλήσετε το ακίνητο σας.`,
      blocks: [
        {
          kind: 'text',
          p: [
            `Νέο Ρύσιο, Τ.Κ.: 57001, Θεσσαλονίκη, Ελλάδα`,
            `T +30 2311 24.12.24`,
            `E info@halkidikiproperties.com`,
          ],
        },
        {
          kind: 'facts',
          h: `Ώρες Λειτουργίας`,
          items: [
            { t: `Δευτέρα - Παρασκευή`, d: `09:30 - 19:00` },
            { t: `Σάββατο`, d: `10:00 - 14:00` },
            // 🪤 «Closed» — αγγλικά και στην ελληνική σελίδα του παλιού site.
            { t: `Κυριακή`, d: `Closed` },
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `Halkidiki Properties | Contact`,
      h1: `Contact Halkidiki Properties`,
      lead: `We are ready to guide you in any process either if you interested in buying, either selling your property.`,
      blocks: [
        {
          kind: 'text',
          p: [
            `Find a realtor and let him guide you to your new home.`,
            `Neo Rysio, P.C.: 57001 Thessaloniki, Greece`,
            `T +30 2311 24.12.24`,
            `E info@halkidikiproperties.com`,
          ],
        },
        {
          kind: 'facts',
          h: `Working hours`,
          items: [
            { t: `Monday - Friday`, d: `09:30 - 19:00` },
            { t: `Saturday`, d: `10:00 - 14:00` },
            { t: `Sunday`, d: `Closed` },
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
  },

  // ── /partners ─────────────────────────────────────────────────────────────
  // Παλιά: /el/συνεργατες · /en/our-partners · /de/unsere-partner · /sr/nasi-partneri · /bg/партньори
  partners: {
    el: {
      title: `Οι συνεργάτες μας`,
      h1: `Οι Συνεργάτες μας`,
      lead: `Οι συνεργάτες και οι φίλοι μας! Τους ευχαριστούμε θερμά για τις πολύτιμες στιγμές και εμπειρίες που βιώσαμε και βιώνουμε μαζί.`,
      blocks: [
        {
          kind: 'text',
          h: `Τι λένε για εμάς.`,
          p: [
            `Στην Halkidiki Properties μια από τις βασικές αρχές είναι η προσεκτική επιλογή κορυφαίων συνεργατών με γνώμονα τον επαγγελματισμό και τις υπηρεσίες υψηλού επιπέδου που προσφέρουν στον πελάτη.`,
            `Θεωρούμε πως μόνο μέσα από τη σωστή συνεργασία μαζί τους μπορούν να παραχθούν τα επιθυμητά αποτελέσματα και είμαστε πολύ περήφανοι για αυτούς. Ας δούμε όμως τι λένε και αυτοί για εμάς.`,
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `Our partners`,
      h1: `Our partners`,
      lead: `Our friends and partners! We are grateful for all the moments and experiences that we are living together!`,
      blocks: [
        {
          kind: 'text',
          h: `Talking about us`,
          p: [
            `One of our primary principles in Halkidiki Properties is the careful choice of our partners driven by their professionalism and high-quality services.`,
            `We believe that the only way to produce the desired results is through proper collaboration and we are very proud of them. But let's see what they have to say about us.`,
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
  },

  // ── /projects ─────────────────────────────────────────────────────────────
  // Παλιά: /el/ακινητα-στη-χαλκιδικη · /en/properties-in-halkidiki-greece
  // ⚠️ Παρότι η route λέγεται `ourProjects`, η σελίδα ΔΕΝ είναι «έργα» — είναι
  //    κατάλογος **τύπων ακινήτου**. Στο υποσέλιδο λέγεται «Τύποι ακινήτων».
  projects: {
    el: {
      title: `Ακίνητα στη Χαλκιδική`,
      h1: `Ακίνητα στη Χαλκιδική`,
      lead: `Όλα τα ακίνητα στη Χαλκιδική. Περιηγηθείτε και να ανακαλύψτε τους διαφορετικούς τύπους ακινήτων και βρείτε αυτό που ταιριάζει σε εσάς.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Βίλες`, d: `Οι βίλες μας στην Χαλκιδική περιμένουν να τις εξερευνήσετε.` },
            { t: `Διαμερίσματα`, d: `Μία πλήρης λίστα με διαμερίσματα στη Χαλκιδική` },
            { t: `Μεζονέτες`, d: `Βρείτε την δική σας στην Χαλκιδική μαζί μας` },
            { t: `Ξενοδοχεία`, d: `Μία διαρκής επένδυση που αποφέρει καρπούς.` },
            { t: `Οικόπεδα`, d: `Ιδανική λύση για κάθε επένδυση.` },
            { t: `Γη`, d: `Εδώ μπορείτε να διαλέξετε ένα κομμάτι γης προς πώληση στην Χαλκιδική ως επένδυση, κατάλληλο για κάθε περίπτωση.` },
            { t: `Μονοκατοικίες`, d: `Tο μελλοντικό σας σπίτι στη Χαλκιδική` },
            { t: `Νησιά`, d: `Ιδανικά για μεγάλες επενδύσεις` },
          ],
        },
      ],
      cta: { label: `Στη λίστα`, to: 'list' },
    },
    en: {
      title: `Properties in Halkidiki Greece`,
      h1: `Properties in Halkidiki Greece`,
      lead: `All properties in Halkidiki Greece. Browse and discover the different property types and find the one that suits you.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Villas`, d: `Our Halkidiki villas wait for you to explore them.` },
            { t: `Apartments`, d: `Apartment for sale Greece Halkidiki` },
            { t: `Homes`, d: `Find yours in Halkidiki with us` },
            { t: `Hotels`, d: `A lasting investment that bears fruit.` },
            { t: `Plots`, d: `Are you looking for the perfect place to build your dream home or invest in a profitable project in Halkidiki?` },
            { t: `Land`, d: `Investing in land is always a wise decision, especially when it comes to the picturesque region of Halkidiki.` },
            { t: `Houses`, d: `Your future home in Halkidiki` },
            { t: `Islands`, d: `Ideal for large investments` },
          ],
        },
      ],
      cta: { label: `To the list`, to: 'list' },
    },
  },

  // ── /sell ─────────────────────────────────────────────────────────────────
  // Παλιά: /el/πωληση · /en/sell · /de/verkaufen · /sr/prodati · /bg/продавам
  // Οι τίτλοι και οι πρώτες προτάσεις της λίστας έρχονται από τις 7 υποσελίδες
  // `/sell/{slug}` του παλιού site — εκεί ζει το πλήρες κείμενο.
  sell: {
    el: {
      title: `Η πώληση μαζί μας`,
      h1: `Πώληση`,
      lead: `Η διαδικασία πώλησης δεν ήταν ποτέ πιο εύκολη! Το νούμερο ένα μεσιτικό γραφείο στη Χαλκιδική.`,
      blocks: [
        {
          kind: 'text',
          p: [`Οι έμπειροι αντιπρόσωποί μας και η τεχνολογία AI μας είναι εδώ για να σας βοηθήσουν να πουλήσετε το ακίνητό σας.`],
        },
        {
          kind: 'text',
          h: `Δούλεψε μαζί μας Αποκλειστικά`,
          p: [`Συνεργάσου μαζί μας αποκλειστικά και ξεκλείδωσε απεριόριστες δυνατότητες`],
        },
        {
          kind: 'list',
          items: [
            { t: `Ανάθεσε το ακίνητό σου`, d: `Αν έχεις ακίνητο και ενδιαφέρεσαι να το πουλήσεις, δες γιατί πρέπει να συνεργαστείς μαζί μας.` },
            { t: `Πραγματικές επισκέψεις`, d: `Μέσα σε μόλις 24 ώρες από τη δημοσίευση του ακινήτου σου λαμβάνεις πραγματικές επισκέψεις από πραγματικούς πελάτες.` },
            { t: `Διαφήμισε το ακίνητο σου`, d: `Τα μεγαλύτερα portals του κόσμου είναι συνεργάτες μας.` },
            { t: `Προσθήκη του ακινήτου στο Secret Portfolio`, d: `Θα ήθελες το ακίνητο σου να μη προβάλλεται ανοιχτά και δημόσια παρά μόνο σε πιστοποιημένους αγοραστές;` },
            { t: `Ολοκλήρωσε την αγοραπωλησία του ακινήτου σου εύκολα`, d: `Η υπηρεσία αυτή είναι σχεδιασμένη προσεκτικά για τους ιδιοκτήτες ακινήτων που αδυνατούν να ασχοληθούν με τη διαδικασία πώληση του ακινήτου τους, κυρίως λόγω απόστασης η έλλειψης χρόνου.` },
            { t: `Το μέλλον του Real Estate της χώρας βρίσκεται εδώ`, d: `Κάνουμε χρήση της τεχνολογίας στο μέγιστο βαθμό δημιουργώντας δυναμικούς αυτοματισμούς που είναι σχεδόν αδύνατον να παραληφθεί πελάτης.` },
            { t: `Γιατί Halkidiki Properties;`, d: `Δες τα στατιστικά μας και ανακάλυψε το λόγο που οι πελάτες, μας εμπιστεύονται τις περιουσίες και τα όνειρά τους.` },
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `Sell with us`,
      h1: `Sell`,
      // 🪤 «us.The» — λείπει το κενό στο ίδιο το meta description του παλιού site.
      lead: `Sell your property with us.The number one real estate agency in Halkidiki.`,
      blocks: [
        {
          kind: 'text',
          p: [`Our experienced agents and our AI-technology are here to help you sell your property.`],
        },
        {
          kind: 'text',
          h: `Why work with us Exclusively?`,
          p: [`Collaborate with us exclusively and unlock unlimited possibilities`],
        },
        {
          kind: 'list',
          items: [
            { t: `Assign to Halkidiki Properties for a Hassle-Free Sale`, d: `Selling your property can be a complex and stressful process, but with Halkidiki Properties, it doesn't have to be.` },
            { t: `Get real-time visits`, d: `Within just 24 hours of the publication of your property receive real visits from real clients.` },
            { t: `Advertise your property`, d: `The largest portals in the world are our partners.` },
            { t: `Halkidiki Properties secret portfolio`, d: `Would you like not to publish your property publicly, but only to certified buyers?` },
            { t: `Make purchase easy`, d: `This service is carefully designed for property owners who are unable to deal with the process of selling their property, mainly due to distance or lack of time.` },
            { t: `The future of real estate`, d: `We make the most of technology by creating dynamic automations that are impossible to miss a customer.` },
            { t: `Why Choose Halkidiki Properties?`, d: `Selling your property can be a challenging process. But when you partner with a reputable real estate agency, the experience can be much smoother and more rewarding.` },
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
  },

  // ── /services (κόμβος) ────────────────────────────────────────────────────
  // 🔴 ΤΟ ΓΥΜΝΟ /services ΔΕΝ ΥΠΑΡΧΕΙ ΣΤΟ ΠΑΛΙΟ SITE — δίνει 404 (μόνο
  //    /services/{category}). Το μόνο πηγαίο κείμενο είναι ο τίτλος «Υπηρεσίες».
  //    Γι' αυτό **δεν υπάρχει `lead`**: εισαγωγή χωρίς πηγή θα ήταν επινόηση. Οι
  //    4 περιγραφές είναι οι πρώτες προτάσεις των ίδιων των υποσελίδων.
  services: {
    el: {
      title: `Υπηρεσίες`,
      h1: `Υπηρεσίες`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Υπηρεσίες για αγοραστές`, d: `Η μεγαλύτερη βάση ακινήτων στην Χαλκιδικη μεδιαδικτυακές περιηγήσεις ακινήτων, επαγγελματίες μεσίτες έτοιμοι να σε βοηθήσουν.` },
            { t: `Υπηρεσίες για πωλητές`, d: `Η εταιρεία μας με χρόνια εξειδίκευσης στον χώρο του real estate μπορεί να σε βοηθήσει στην επίτευξη των στόχων σου για μια επιτυχημένεη πώληση.` },
            { t: `Υπηρεσιες για Επενδυτές`, d: `Επενδυτικά έργα με σταθερό εισόδημα στη Χαλκιδική. Ξενοδοχειακή επιχείρηση, αγορά έτοιμου επαγγελματικού, εμπορικού και οικιστικού ακινήτου.` },
            { t: `Υπηρεσίες Κατασκευαστή`, d: `Κτίσε αυτό που θέλεις. Εάν έχεις έτοιμο project ή απλά μια ιδέα για το σπίτι των ονείρων σου, είμαστε έτοιμοι να σε βοηθήσουμε για να το πετύχουμε μαζί.` },
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `Services`,
      h1: `Services`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Buyer services`, d: `The largest real estate database in Halkidiki, online viewings, professional agents ready to help you, are just a few options that we offer.` },
            { t: `Seller services`, d: `Our company seller services, with years of experience in real estate can help you to achive your your goals for a successful sales process.` },
            { t: `Investor Services`, d: `Investment projects generating stable income in Halkidiki. Hotel business, purchase of a ready-made business, commercial and residential real estate.` },
            { t: `Construction Services`, d: `Build with us. If you have a finished project, or just an idea for your dream home, we are ready to use all our resources to achieve the ultimate goal.` },
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
  },

  // ── /services/buyers ──────────────────────────────────────────────────────
  // Παλιά: /el/υπηρεσιες/υπηρεσιες-αγοραστων · /en/services/buyer-services
  'services/buyers': {
    el: {
      title: `Υπηρεσίες για Αγοραστές`,
      h1: `Υπηρεσίες για αγοραστές`,
      // 🪤 «Χαλκιδικη μεδιαδικτυακές» — τυπογραφικό του παλιού meta description.
      lead: `Η μεγαλύτερη βάση ακινήτων στην Χαλκιδικη μεδιαδικτυακές περιηγήσεις ακινήτων, επαγγελματίες μεσίτες έτοιμοι να σε βοηθήσουν.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Μεσολάβηση και διαπραγμάτευση ακινήτων` },
            { t: `Αρχιτεκτονικές υπηρεσίες και μελέτες | 3D designs` },
            { t: `Οικονομοτεχνικές μελέτες | Επιχειρηματικά πλάνα` },
            { t: `Εκτιμήσεις, Νομικός και Λογιστικός Έλεγχος` },
            { t: `Πλήρης διεκπεραίωση αγοραπωλησιών` },
            { t: `Μεταφράσεις και διερμηνείες` },
            { t: `Πλήρης διαχείριση ακίνητης περιουσίας` },
            { t: `Αποκλειστικοί συνεργάτες τύπου VIP Concierge` },
            { t: `Ίδρυση και διαχείριση εταιρειών` },
            { t: `Αεροπορικές, πλωτές και οδικές μεταφορές` },
            { t: `Αναζήτηση, επίσκεψη και εύρεση ακινήτου` },
            { t: `Πλήρης υποστήριξη για νομικές και χρηματοοικονομικές υπηρεσίες` },
          ],
        },
      ],
      cta: { label: `Στη λίστα`, to: 'list' },
    },
    en: {
      title: `Buyer Services`,
      h1: `Buyer services`,
      lead: `The largest real estate database in Halkidiki, online viewings, professional agents ready to help you, are just a few options that we offer.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Mediation and negotiation for property` },
            { t: `Architectural services and studies | 3D designs` },
            { t: `Financial studies and business plans` },
            { t: `Appraisals, Legal and Accounting Audit` },
            { t: `Entire purchases conduction` },
            { t: `Translations and interpretations` },
            { t: `Full property management` },
            { t: `VIP Concierge - Dedicated service partners` },
            { t: `Company establishment and management` },
            { t: `Air, sea and road transportation` },
            { t: `Enquiry, viewing trip and selection of property` },
            { t: `Full support for any legal and financial services` },
          ],
        },
      ],
      cta: { label: `To the list`, to: 'list' },
    },
  },

  // ── /services/developers ──────────────────────────────────────────────────
  // Παλιά: /el/υπηρεσιες/υπηρεσιες-κατασκευαστες · /en/services/construction-services
  'services/developers': {
    el: {
      title: `Υπηρεσίες για Κατασκευαστές`,
      h1: `Υπηρεσίες Κατασκευαστή`,
      lead: `Κτίσε αυτό που θέλεις. Εάν έχεις έτοιμο project ή απλά μια ιδέα για το σπίτι των ονείρων σου, είμαστε έτοιμοι να σε βοηθήσουμε για να το πετύχουμε μαζί.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Συστήματα απομακρυσμένης εποπτείας` },
            { t: `Συστήματα ενδοδαπέδιας ψύξης - θέρμανσης` },
            { t: `Εφαρμογές Γεωθερμίας` },
            { t: `Υβριδικά συστήματα για ανεξάρτητες κατοικίες` },
            { t: `Εγκατάσταση Φωτοβολταϊκών Συστημάτων` },
            { t: `Αυτόνομα συστήματα Ψύξης - Θέρμανσης` },
            { t: `Ηλεκτρικές και υδραυλικές εγκαταστάσεις` },
            { t: `Εγγύηση κατασκευής` },
            { t: `Διαμόρφωση και διαχείριση περιβάλλοντα χώρου` },
            { t: `Ειδικές κατασκευές Πισινών` },
            { t: `Επίβλεψη και ενημέρωση - Reporting με ζωντανό βίντεο` },
            { t: `Συστήματα βιολογικού καθαρισμού υδάτων` },
            { t: `Βιοκλιματικές παθητικές κατοικίες` },
            { t: `Ολοκληρωμένες μελέτες κατασκευής` },
            { t: `Οικονομοτεχνικές μελέτες βιωσιμότητας και σκοπιμότητας` },
            { t: `Ανάλυση και προ-κοστολογηση έργου` },
            { t: `Ολοκληρωμένες λύσεις δομικών ανακαινίσεων` },
            { t: `Άδειες δόμησης` },
            { t: `Ηλεκτρομηχανολογικές Μελέτες` },
            { t: `Μεταλλικές κατασκευές κατοικιών` },
            { t: `Μελέτες και εφαρμογές θερμομόνωσης` },
            { t: `Εκσκαφές και θεμελιώσεις` },
            { t: `Κατασκευές από μπετόν, πέτρα, τούβλο, πάνελ` },
            { t: `Μελέτες Περιβαλλοντικών Επιπτώσεων (Μ.Π.Ε.)` },
          ],
        },
      ],
      cta: { label: `Επικοινωνία`, to: 'phone' },
    },
    en: {
      title: `Construction Services`,
      h1: `Construction Services`,
      lead: `Build with us. If you have a finished project, or just an idea for your dream home, we are ready to use all our resources to achieve the ultimate goal.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Remote monitoring systems` },
            { t: `Underfloor heating - cooling systems` },
            { t: `Applications of Geothermal Energy` },
            { t: `Hybrid systems for independent residences` },
            { t: `Photovoltaic systems installations` },
            { t: `Individual Heating - Cooling systems` },
            { t: `Electrical and plumbing installations` },
            { t: `Construction guarantee` },
            { t: `Landscaping and management of surrounding area` },
            { t: `Swimming pool constructions` },
            { t: `Supervision and live video reporting` },
            { t: `Biological sewage treatment systems` },
            { t: `Bioclimatic passive residences` },
            { t: `Complete structural studies` },
            { t: `Financial viability and feasibility reports` },
            { t: `Cost estimation and analysis for a construction` },
            { t: `Complete structural renovation solutions` },
            { t: `Building licenses` },
            { t: `Electro-Mechanical studies` },
            { t: `Metal building constructions` },
            { t: `Thermal insulation studies and installations` },
            { t: `Excavation and foundation` },
            { t: `Constructions of concrete, stone, brick, panel` },
            { t: `Environmental Impact Studies (M.P.E.)` },
          ],
        },
      ],
      cta: { label: `Contact`, to: 'phone' },
    },
  },

  // ── /services/investors ───────────────────────────────────────────────────
  // Παλιά: /el/υπηρεσιες/υπηρεσιες-για-επενδυτες · /en/services/investor-services
  // Η σελίδα δεν έχει λίστα — έχει 3 κάρτες που ανοίγουν υποσελίδες. Εδώ μπαίνει
  // το πλήρες κείμενο των τριών.
  'services/investors': {
    el: {
      // 🪤 «Υπηρεσιες» χωρίς τόνο — έτσι είναι στο παλιό site.
      title: `Υπηρεσιες για Επενδυτές`,
      h1: `Υπηρεσιες για Επενδυτές`,
      lead: `Επενδυτικά έργα με σταθερό εισόδημα στη Χαλκιδική. Ξενοδοχειακή επιχείρηση, αγορά έτοιμου επαγγελματικού, εμπορικού και οικιστικού ακινήτου.`,
      blocks: [
        {
          kind: 'text',
          h: `Μαρίνες - Λιμάνια`,
          p: [
            `Αναλαμβάνουμε τη μελέτη και επίβλεψη της κατασκευής λιμενικών έργων (εμπορικών και επιβατικών λιμένων, μαρίνων, αλιευτικών και τουριστικών καταφυγίων κ.α.).`,
            `Παρέχουμε υπηρεσίες Τεχνικού Συμβούλου και Συμβούλου Διαχείρισης Έργων Υποδομής και μπορούμε να διεξάγουμε πραγματογνωμοσύνες σε τεχνικά ή περιβαλλοντικά θέματα.`,
            `Τέλος, η εταιρεία μας αξιοποιεί μία πλήρη σειρά μαθηματικών μοντέλων σε υπολογιστές που προσομοιώνουν τα ακτομηχανικά φαινόμενα (κυματισμός, ρεύματα, στερεομεταφορά και τις περιβαλλοντικές επιπτώσεις της κατασκευής μιας μαρίνας (διάχυση ρύπων, πρόβλεψη στάθμης θορύβου κ.α.).`,
          ],
        },
        {
          kind: 'text',
          h: `Τι είναι οι Δημοπρασίες ΤΑΙΠΕΔ ;`,
          p: [
            `Η εταιρεία μας είναι ανάμεσα στους προνομιούχους διαχειριστές του πλήρους χαρτοφυλακίου με τα ακίνητα του Ελληνικού Δημοσίου μέσω του ΤΑΙΠΕΔ και μπορεί επίσημα να εκπροσωπήσει οποιονδήποτε ενδιαφερόμενο επενδυτή στην κατάθεση και διαχείριση των απαραίτητων δικαιολογητικών και να φέρει εις πέρας όλες τις διαδικασίες που εξασφαλίζουν τη συμμετοχή του στις δημοπρασίες του ΤΑΙΠΕΔ.`,
          ],
        },
        {
          kind: 'text',
          h: `Μελέτες και κατασκευές ξενοδοχείων`,
          p: [
            `Η εταιρεία μας αναλαμβάνει τη μελέτη, κατασκευή, επίβλεψη και ανάπτυξη ξενοδοχειακών μονάδων σε ένα φάσμα που καλύπτει από την κατασκευή τους έως και την πλήρη διαχείρισή τους.`,
            `Πραγματοποιούμε νομικούς και λογιστικούς ελέγχους για υφιστάμενες μονάδες – εταιρείες προς αγορά. Τέλος, διεξάγουμε μελέτες βιωσιμότητας και παρέχουμε συμβουλευτικές υπηρεσίες σε όλους τους κλάδους των τουριστικών επενδύσεων.`,
          ],
        },
      ],
      cta: { label: `Στη λίστα`, to: 'list' },
    },
    en: {
      title: `Investor Services`,
      h1: `Investor Services`,
      lead: `Investment projects generating stable income in Halkidiki. Hotel business, purchase of a ready-made business, commercial and residential real estate.`,
      blocks: [
        {
          kind: 'text',
          h: `Ports - Marinas design`,
          p: [
            `We undertake the study, design and supervision of port project construction (either commercial or passenger ports, marinas, fishing and tourist harbors, etc.).`,
            `We provide services of Technical Consultor and Infrastructure Projects Manager, and can also provide an expert's opinion for technical or environmental issues.`,
            `Finally, our company utilizes a full range of mathematical models in computers to simulate coast-mechanics phenomena (waves, water flows, sediment transportation) and environmental impact of the construction of a marina or port (dispersion of pollutants, level of noise prediction, etc.).`,
            `Halkidiki Properties constructions, the expertise on ports and marinas designs.`,
          ],
        },
        {
          kind: 'text',
          h: `What is HRADF?`,
          p: [
            `The Hellenic Republic Assets Development Fund (HRADF) sells and leases state-owned property through public tenders. At Halkidiki Properties we support interested investors through the process of gathering, managing and submitting the documents required for HRADF's tenders.`,
            `Our expertise in managing and developing properties makes us a valuable partner to those interested in participating in HRADF's tenders. We have a deep understanding of the legal and administrative procedures involved in the tender process and can guide investors through each step, from the initial inquiry to the final acquisition.`,
            `Our services are designed to ensure that our clients have a seamless and successful experience when participating in HRADF's tenders. We offer a range of services that include due diligence, legal support, property management, and construction supervision. We understand that each investor's needs are unique, and we are committed to providing personalized solutions that are tailored to our clients' specific requirements.`,
            `If you are interested in participating in HRADF's tenders and want to ensure that your investment is in the best possible hands, we invite you to contact us today. Our team of experts is ready to answer any questions you may have and to provide you with all the information you need to make an informed decision. Let us help you navigate the complex process of acquiring properties through HRADF's tenders, so you can achieve your investment goals and realize your vision for your project.`,
          ],
        },
        {
          kind: 'text',
          h: `Hotel designs and constructions`,
          p: [
            `Our offices undertakes the study, design, construction, supervision and development of hotels units covering a wide range from the construction up to their full management.`,
            `We perform legal controls and audits for existing units - companies for sale. Also, we conduct viability and feasibility studies and provide consultant services to all sectors of tourism investments.`,
          ],
        },
      ],
      cta: { label: `To the list`, to: 'list' },
    },
  },

  // ── /services/owners ──────────────────────────────────────────────────────
  // Παλιά: /el/υπηρεσιες/για-πωλητες · /en/services/seller-services
  'services/owners': {
    el: {
      title: `Υπηρεσίες για Πωλητές`,
      h1: `Υπηρεσίες για πωλητές`,
      // 🪤 «επιτυχημένεη» — τυπογραφικό του παλιού meta description.
      lead: `Η εταιρεία μας με χρόνια εξειδίκευσης στον χώρο του real estate μπορεί να σε βοηθήσει στην επίτευξη των στόχων σου για μια επιτυχημένεη πώληση.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Ανάθεση διαχείρισης ακινήτου` },
            { t: `Πακέτα διαφήμισης σε portals` },
            { t: `Επαγγελματικές φωτογραφίες και βιντεολήψεις` },
            { t: `Επαγγελματικές αεροφωτογραφίες και αεροβιντεολήψεις` },
            { t: `Ηλεκτρονική ανάθεση και επιλογή πακέτου διαφήμισης ακινήτου` },
            { t: `Πιστοποιητικά Ενεργειακής Απόδοσης (ΠΕΑ)` },
            { t: `Φωτορεαλιστικά και 360 view` },
          ],
        },
      ],
      cta: { label: `Πώς δουλεύουμε`, to: 'sell' },
    },
    en: {
      title: `Seller Services`,
      h1: `Seller services`,
      // 🪤 «achive your your» — τυπογραφικά του παλιού meta description.
      lead: `Our company seller services, with years of experience in real estate can help you to achive your your goals for a successful sales process.`,
      blocks: [
        {
          kind: 'list',
          items: [
            { t: `Delegation of property management` },
            { t: `Ad packages for worldwide portals` },
            { t: `Professional photography and videos` },
            { t: `Professional aerial photos and videos of properties` },
            { t: `Online delegation and selection of ad package` },
            { t: `Energy Efficiency Certificates (PEA)` },
            { t: `Photorealistic and 360 view` },
          ],
        },
      ],
      cta: { label: `How we work`, to: 'sell' },
    },
  },
};
