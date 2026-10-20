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
    /** Title without the brand — the brand is appended from the brand config. */
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    lead: z.string().default(''),
    section: z.enum(['legal', 'sell', 'company', 'services']),
    /** schema.org type of the page itself. */
    schema: z.enum(['WebPage', 'FAQPage', 'AboutPage', 'ContactPage', 'Service', 'CollectionPage']).default('WebPage'),
    /** Breadcrumb between home and the page (e.g. Sell, Services, About us). */
    parents: z.array(z.object({ name: z.string(), path: z.string() })).default([]),
    image: z.string().default(''),
    image_alt: z.string().default(''),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** A contact form posting to /api/inquiry; `source` prefixes the message. */
    form: z.object({ source: z.string(), title: z.string().default(''), message: z.boolean().default(true) }).optional(),
    related: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
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
  }),
});

export const collections = { articles, pages };
