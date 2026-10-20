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

export const collections = { articles };
