import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';

export const docs = defineDocs({
  dir: '..',
  docs: {
    files: [
      'README.md',
      'CHANGELOG.md',
      'ImplementGuide/**/*.md',
      'CoLinkBusiness/**/*.md',
      'CoLinkP2P/**/*.md',
      'CoLinkServerRESTAPI/**/*.md',
    ],
    schema: pageSchema.extend({
      title: pageSchema.shape.title.optional(),
    }),
  },
  meta: {
    files: [],
  },
});

export default defineConfig();
