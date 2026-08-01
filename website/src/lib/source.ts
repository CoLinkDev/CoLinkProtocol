import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { loader, update } from 'fumadocs-core/source';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { applyMdxPreset } from 'fumadocs-mdx/config';

import { protocolNavigation } from './protocol-navigation';

type MarkdownNode = {
  children?: MarkdownNode[];
  depth?: number;
  type?: string;
  url?: string;
};

const protocolRoot = resolve(process.cwd(), '..');

function resolveProtocolPath(path?: string): string | undefined {
  return path ? resolve(protocolRoot, path) : undefined;
}

function shouldPublish(path?: string): boolean {
  return Boolean(path && !path.endsWith('AGENTS.md') && statSync(path).size > 0);
}

function deriveTitle(path: string | undefined, fallback?: string): string | undefined {
  if (!path) return fallback;

  const heading = readFileSync(path, 'utf8').match(/^#\s+(.+)$/m)?.[1];
  return heading?.replace(/\s+\[#.+\]$/, '').replace(/`/g, '') ?? fallback;
}

function remarkNormalizeProtocolMarkdown() {
  return (tree: MarkdownNode) => {
    const firstH1 = tree.children?.findIndex((node) => node.type === 'heading' && node.depth === 1);
    if (firstH1 !== undefined && firstH1 >= 0) tree.children?.splice(firstH1, 1);

    const visit = (node: MarkdownNode) => {
      if (node.type === 'link' && node.url?.match(/^[^/#][^#]*\.md(?:#.*)?$/)) {
        node.url = `./${node.url}`;
      }
      node.children?.forEach(visit);
    };

    visit(tree);
  };
}

const docs = defineDocs({
  dir: '..',
  docs: {
    files: [
      '*.md',
      'ImplementGuide/**/*.md',
      'CoLinkBusiness/**/*.md',
      'CoLinkP2P/**/*.md',
      'CoLinkServerRESTAPI/**/*.md',
    ],
    schema: pageSchema.extend({
      title: pageSchema.shape.title.optional(),
    }),
    mdxOptions: applyMdxPreset({
      remarkPlugins: (plugins) => [remarkNormalizeProtocolMarkdown, ...plugins],
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    files: [],
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: update(docs.toFumadocsSource())
    .files((files) => [
      ...files.filter(
        (file) => file.type === 'page' && shouldPublish(resolveProtocolPath(file.absolutePath)),
      ),
      ...protocolNavigation.map((item) => ({ type: 'meta' as const, ...item })),
    ])
    .page((page) => ({
      ...page,
      data: {
        ...page.data,
        title: deriveTitle(resolveProtocolPath(page.absolutePath), page.data.title),
      },
    }))
    .build(),
  plugins: [],
});

export function getPageImageUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: '/' + [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: '/' + [page.locale, ...docsContentRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
