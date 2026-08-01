import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'CoLink Protocol',
      url: '/',
    },
    links: [
      {
        text: 'GitHub',
        url: 'https://github.com/CoLinkDev/CoLinkProtocol',
        external: true,
      },
    ],
  };
}
