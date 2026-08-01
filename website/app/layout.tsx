import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';

import 'fumadocs-ui/css/preset.css';
import 'fumadocs-ui/css/neutral.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CoLink Protocol',
    template: '%s | CoLink Protocol',
  },
  description: 'CoLink protocol specifications and implementation guides.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
