import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
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
        image: z.string(),
        caption: z.string().optional(),
      })
    ),
  }),
});

export const collections = { posts };
