import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter, EnvironmentBanner } from '@/components/layout/site-footer';
import { themeScript } from '@/components/layout/theme-toggle';
import { getConfig } from '@/lib/config';
import { getCategories } from '@/lib/api-server';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Blogpost — Ideas worth your time', template: '%s · Blogpost' },
  description: 'Thoughtful stories, useful ideas, and fresh perspectives. A quiet place to read.',
  applicationName: 'Blogpost',
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = getConfig();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const categories = await getCategories({ pageSize: 10 })
    .then((result) => result.data)
    .catch(() => []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <EnvironmentBanner environment={config.environment} />
        <SiteHeader categories={categories} loginEnabled={config.loginEnabled} />
        <main id="main-content" className="container" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
