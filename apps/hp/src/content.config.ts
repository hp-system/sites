// Content collections. Page texts live in files inside the template (George 20/10/2026:
// no CMS) — the articles are the first collection.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  // src/content/articles/{lang}/{category}/{slug}.md — the id keeps the folders.
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    h1: z.string(),
    category: z.string(),
    slug: z.string(),
    /** Where the article lived on the old site — the 301 engine will read it. */
    old_url: z.string(),
    clean_url: z.string(),
    author: z.string().default(''),
    published: z.string().default(''),
    updated: z.string().default(''),
    reading_time: z.union([z.string(), z.number()]).optional(),
    byline_note: z.string().optional(),
    hero_image: z.string().default(''),
    og_image: z.string().default(''),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    has_calculator: z.boolean().default(false),
    sources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
  }).passthrough(),
});

// Info pages — legal, sell, company, services (English first, George 20/10/2026).
// One file per URL: src/content/pages/en/{path}.md; `path` is the public URL.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    path: z.string(),
    /** Page language (#94); English unless the file says otherwise. */
    lang: z.enum(['el', 'en', 'bg', 'sr', 'de', 'ro', 'tr', 'he', 'ru']).default('en'),
    /** Same `key` = translations of one page: hreflang cluster + sitemap alternates (#94). */
    key: z.string().default(''),
    /** Title without the brand — the brand is appended from the brand config. */
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    lead: z.string().default(''),
    section: z.enum(['legal', 'sell', 'company', 'services', 'buy', 'members']),
    /** schema.org type of the page itself. */
    schema: z.enum(['WebPage', 'FAQPage', 'AboutPage', 'ContactPage', 'Service', 'CollectionPage']).default('WebPage'),
    /** Breadcrumb between home and the page (e.g. Sell, Services, About us). */
    parents: z.array(z.object({ name: z.string(), path: z.string() })).default([]),
    image: z.string().default(''),
    image_alt: z.string().default(''),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** A contact form posting to /api/inquiry; `source` prefixes the message. */
    form: z.object({ source: z.string(), title: z.string().default(''), message: z.boolean().default(true) }).optional(),
    /** Related pages. On a `look: wave1` page they are cards on desktop (#105): an optional
     *  picture, a short line and the button label (default: «Learn more»). */
    related: z.array(z.object({
      label: z.string(), href: z.string(),
      text: z.string().default(''), image: z.string().default(''), image_alt: z.string().default(''),
      button: z.string().default(''),
    })).default([]),
    toc: z.boolean().default(false),
    updated: z.string().default(''),
    /** Where the page lived on the old site (same URL in most cases). */
    old_url: z.string().default(''),
    /** The live text is short — kept faithful, listed for content work. */
    needs_content: z.boolean().default(false),
    /** Tiles to the pages below this one (sell, about us, careers hubs). */
    cards: z.array(z.object({
      title: z.string(), href: z.string(), text: z.string(),
      image: z.string().default(''), image_alt: z.string().default(''),
      width: z.number().default(0), height: z.number().default(0),
    })).default([]),
    /** Address, phone and e-mail from the brand config (contact page). */
    contact_card: z.boolean().default(false),
    /** Services described on the page (sections of a services page) → Service.hasOfferCatalog. */
    catalog: z.array(z.object({ name: z.string(), url: z.string() })).default([]),
    /** Live data block rendered after the text: price tables, "from €" guide, pre-published list. */
    widget: z.enum(['prices', 'greece-guide', 'prepublished']).optional(),
    /** A call to action shown under the lead (e.g. Sign in / Register for the members pages). */
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
    /** Desktop redesign, wave 1 (#105, approved by George 2026-11-02): the info-page base shared by
     *  Sell, Services and Company — hero with a photo, cards as a carousel, the dark form, Related and
     *  area carousels. Phones keep George's layout. Pages without it are unchanged. */
    look: z.enum(['wave1']).optional(),
    /** `company`: the page is the company hub (CompanyHub on desktop), only /about-us; its sub pages on the kit are ordinary info pages */
    hub: z.enum(['company']).optional(),
    /** Desktop hero photo of a `wave1` page — a watermarked `_1920w.jpg` of ours (+ `_800w`). */
    desk_image: z.string().default(''),
    desk_image_alt: z.string().default(''),
  }),
});

// SEO pages of George's spec (#150, plan E-111): src/content/seo/{PageID}/{lang}.json, written by
// scripts/import-seo-spec.mjs from the xlsx and checked by scripts/test-seo-spec.mjs. Not rendered
// yet: the templates read it from stage 2 on. Only EN is switched on until the languages stage.
const seo = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/seo' }),
  schema: z.object({
    id: z.string().regex(/^P\d{2}$/),
    lang: z.enum(['el', 'en', 'bg', 'sr', 'de', 'ro', 'tr', 'he', 'ru']),
    buildOrder: z.number().nullable(),
    priority: z.string(),
    name: z.string(),
    pageType: z.string(),
    path: z.string().startsWith('/'),
    keyword: z.object({
      primary: z.string(), volume: z.number(),
      secondary: z.array(z.string()), otherGeography: z.array(z.string()),
    }),
    titleFocus: z.string(),
    title: z.string().max(60),
    meta: z.string().min(130).max(155),  // spec 0_README rule 7
    h1: z.string().min(1),
    h2: z.array(z.string()),
    faqQuestions: z.array(z.string()),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    intro: z.string(),
    body: z.string(),
    listingFilter: z.string(),
    indexing: z.string(),
    canonical: z.string(),
    hreflang: z.string(),
    schema: z.array(z.string()),
    breadcrumb: z.array(z.string()),
    heroAlt: z.string(),
    galleryAltPattern: z.string(),
    ogTitle: z.string(),
    anchor: z.string(),
    anchorVariants: z.array(z.string()),
    linksOut: z.array(z.object({ anchor: z.string(), href: z.string() })),
    linkedFrom: z.array(z.string()),
    cta: z.string(),
    oldUrls: z.array(z.object({ path: z.string(), clicks: z.number() })),
    words: z.number(),
    editorialLine: z.string(),
    lawyerCheck: z.string(),
  }),
});

export const collections = { articles, pages, seo };
