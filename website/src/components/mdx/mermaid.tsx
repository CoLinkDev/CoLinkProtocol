'use client';

import { use, useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

type MermaidProps = {
  chart: string;
};

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, createPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = createPromise();
  cache.set(key, promise);
  return promise;
}

export function Mermaid({ chart }: MermaidProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

function MermaidContent({ chart }: MermaidProps) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')));

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    fontFamily: 'inherit',
    themeCSS: 'margin: 1.5rem auto 0;',
    theme: resolvedTheme === 'dark' ? 'dark' : 'default',
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${id}-${chart}-${resolvedTheme}`, () => mermaid.render(id, chart.replaceAll('\\n', '\n'))),
  );

  return (
    <div
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
