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
        '---Implementation---',
        'ImplementGuide',
        '---History---',
        'CHANGELOG',
        '...',
      ],
    },
  },
  { path: 'ImplementGuide/meta.json', data: { title: 'Implementation Guide' } },
  { path: 'CoLinkBusiness/meta.json', data: { title: 'Business Protocol' } },
  { path: 'CoLinkP2P/meta.json', data: { title: 'P2P Protocol' } },
  { path: 'CoLinkP2P/websocket/meta.json', data: { title: 'P2P WebSocket' } },
  { path: 'CoLinkServerRESTAPI/meta.json', data: { title: 'Server REST API' } },
  { path: 'CoLinkServerRESTAPI/auth/meta.json', data: { title: 'Authentication' } },
  { path: 'CoLinkServerRESTAPI/devices/meta.json', data: { title: 'Devices' } },
  { path: 'CoLinkServerRESTAPI/push/meta.json', data: { title: 'Push Notification' } },
  { path: 'CoLinkServerRESTAPI/update/meta.json', data: { title: 'Updates' } },
  { path: 'CoLinkServerRESTAPI/websocket/meta.json', data: { title: 'Cloud WebSocket' } },
];
