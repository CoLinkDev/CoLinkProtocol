import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

import { source } from '@/lib/source';

export function getMdxComponents(
  page: (typeof source)['$inferPage'],
): MDXComponents {
  const DefaultLink = defaultMdxComponents.a;

  function RelativeLink({ href, ...props }: ComponentProps<'a'>) {
    const target = href?.match(/^[^/#][^#]*\.md(?:#.*)?$/) ? `./${href}` : href;
    const resolvedHref = target ? source.resolveHref(target, page) : target;

    return <DefaultLink href={resolvedHref} {...props} />;
  }

  return {
    ...defaultMdxComponents,
    a: RelativeLink,
  };
}
