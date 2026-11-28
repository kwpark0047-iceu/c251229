import type { MetadataRoute } from 'next';
import { indexPublicPages, origin } from './seo';

export default function robots(): MetadataRoute.Robots {
  if (!indexPublicPages) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${origin}/sitemap.xml`,
  };
}
