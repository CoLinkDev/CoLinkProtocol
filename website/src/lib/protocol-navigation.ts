import type { MetaData } from 'fumadocs-core/source';

type NavigationMeta = {
  path: string;
  data: MetaData;
};

export const protocolNavigation: NavigationMeta[] = [
  {
    path: 'meta.json',
    data: {
      title: 'CoLink Protocol',
      pages: [
        'README',
        '---Protocol Specifications---',
        'CoLinkServerRESTAPI',
        'CoLinkP2P',
        'CoLinkBusiness',
        'CoLinkURLScheme',
        '---Implementation---',
        'ImplementGuide',
        '---History---',
        'CHANGELOG',
        '...',
      ],
    },
  },
  { 
    path: 'ImplementGuide/meta.json', 
    data: { title: 'Implementation Guide', pagesIndex: 'ImplementGuide/README'} 
  },
  {
    path: 'CoLinkBusiness/meta.json',
    data: { title: 'Business Protocol', pagesIndex: 'README' },
  },
  {
    path: 'CoLinkURLScheme/meta.json',
    data: { title: 'CoLink URL Scheme', pagesIndex: 'README' },
  },
  {
    path: 'CoLinkP2P/meta.json',
    data: { title: 'P2P Protocol', pagesIndex: 'websocket/README' },
  },
  {
    path: 'CoLinkP2P/websocket/meta.json',
    data: { title: 'P2P WebSocket', pagesIndex: 'README' },
  },
  {
    path: 'CoLinkServerRESTAPI/meta.json',
    data: { title: 'Server REST API', pagesIndex: 'README' },
  },
  { path: 'CoLinkServerRESTAPI/auth/meta.json', data: { title: 'Authentication' } },
  { path: 'CoLinkServerRESTAPI/devices/meta.json', data: { title: 'Devices' } },
  {
    path: 'CoLinkServerRESTAPI/push/meta.json',
    data: { title: 'Push Notification', pagesIndex: 'README' },
  },
  { path: 'CoLinkServerRESTAPI/update/meta.json', data: { title: 'Updates' } },
  { path: 'CoLinkServerRESTAPI/websocket/meta.json', data: { title: 'Cloud WebSocket' } },
];
