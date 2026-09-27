import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/posts",
  }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    lang: z.string(),
    permalink: z.string().optional(),
    description: z.string(),
    tags: z.array(z.string()),
    cover_image: z.string().optional(),
    cards: z.array(
      z.object({
        name: z.string(),
        scryfallName: z.string().optional(),
        image: z.string(),
        caption: z.string().optional(),
      }),
    ),
    related_cards: z.array(z.string()).optional(),
  }),
});

export const collections = { posts };
