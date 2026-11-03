import type { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const config = getConfig();
  return config.environment === 'production'
    ? {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: ['/studio', '/invite', '/sign-in', '/search', '/api/'],
        },
        ...(config.webOrigin ? { sitemap: `${config.webOrigin}/sitemap.xml` } : {}),
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
