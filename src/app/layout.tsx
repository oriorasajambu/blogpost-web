import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter, EnvironmentBanner } from '@/components/layout/site-footer';
import { themeScript } from '@/lib/theme';
import { draftHistoryGuardScript } from '@/lib/draft-history-guard';
import { ReadingNavigation, ReadingContent } from '@/components/layout/reading-navigation';
import { getConfig } from '@/lib/config';
import { getCategories } from '@/lib/api-server';
import './globals.css';
// Downloaded at build time and served from this origin, so readers never contact Google.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Blogpost — Ideas worth your time', template: '%s · Blogpost' },
  description: 'Thoughtful stories, useful ideas, and fresh perspectives. A quiet place to read.',
  applicationName: 'Blogpost',
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = getConfig();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // Presence only, for the header link; /studio still verifies membership with the backend.
  // Sign-in and sign-out reload the document, so the layout re-renders with the new state.
  const staffSession = config.loginEnabled && (await cookies()).has(config.sessionCookie);
  const categories = await getCategories({ pageSize: 10 })
    .then((result) => result.data)
    .catch(() => []);
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: draftHistoryGuardScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ReadingNavigation>
          <EnvironmentBanner environment={config.environment} />
          <SiteHeader
            categories={categories}
            loginEnabled={config.loginEnabled}
            staffSession={staffSession}
          />
          <ReadingContent>{children}</ReadingContent>
          <SiteFooter />
        </ReadingNavigation>
      </body>
    </html>
  );
}
