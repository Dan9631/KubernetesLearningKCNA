import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Los módulos del curso viven en ../curso/*.md y son la única fuente de verdad.
// No llevan frontmatter: el título se toma del primer "# " y los metadatos de src/lib/modules.ts.
const curso = defineCollection({
  loader: glob({ base: '../curso', pattern: '*.md' }),
});

export const collections = { curso };
