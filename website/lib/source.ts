import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { loader, update } from 'fumadocs-core/source';
import { docs } from 'collections/server';

import { navigation } from '@/lib/navigation';

const protocolRoot = resolve(process.cwd(), '..');

function resolveProtocolPath(path?: string): string | undefined {
  return path ? resolve(protocolRoot, path) : undefined;
}

function shouldPublish(path?: string): boolean {
  if (!path) return false;

  return !path.endsWith('AGENTS.md') && statSync(path).size > 0;
}

function deriveTitle(path: string | undefined, fallback?: string): string | undefined {
  if (!path) return fallback;

  const heading = readFileSync(path, 'utf8').match(/^#\s+(.+)$/m)?.[1];
  return heading?.replace(/\s+\[#.+\]$/, '').replace(/`/g, '') ?? fallback;
}

const content = update(docs.toFumadocsSource())
  .files((files) => [
    ...files.filter(
      (file) => file.type === 'page' && shouldPublish(resolveProtocolPath(file.absolutePath)),
    ),
    ...navigation.map((item) => ({ type: 'meta' as const, ...item })),
  ])
  .page((page) => ({
    ...page,
    data: {
      ...page.data,
      title: deriveTitle(resolveProtocolPath(page.absolutePath), page.data.title),
    },
  }))
  .build();

export const source = loader({
  baseUrl: '/docs',
  source: content,
});
