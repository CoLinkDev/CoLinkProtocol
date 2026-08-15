'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

type MermaidProps = {
  chart: string;
};

let mermaidModule: Promise<typeof import('mermaid')> | undefined;
let renderQueue = Promise.resolve();

function loadMermaid() {
  mermaidModule ??= import('mermaid');
  return mermaidModule;
}

function queueRender(task: () => Promise<void>) {
  const next = renderQueue.then(task, task);
  renderQueue = next.catch(() => undefined);
  return next;
}

export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [error, setError] = useState<string>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.replaceChildren();
    setError(undefined);

    void queueRender(async () => {
      if (cancelled) return;

      const { default: mermaid } = await loadMermaid();
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeCSS: 'margin: 1.5rem auto 0;',
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });

      const { svg, bindFunctions } = await mermaid.render(`mermaid-${id}`, chart.replaceAll('\\n', '\n'));
      if (cancelled) return;

      container.innerHTML = svg;
      bindFunctions?.(container);
    }).catch((reason: unknown) => {
      if (cancelled) return;

      const message = reason instanceof Error ? reason.message : 'Unknown Mermaid rendering error';
      console.error('Unable to render Mermaid diagram.', reason);
      setError(message);
    });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [chart, id, resolvedTheme]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg border p-4 text-sm">
        Mermaid diagram could not render: {error}
        {'\n\n'}
        {chart}
      </pre>
    );
  }

  return <div ref={containerRef} aria-label="Mermaid diagram" />;
}
