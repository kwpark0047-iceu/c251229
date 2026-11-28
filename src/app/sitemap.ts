import type { MetadataRoute } from 'next';
import { indexPublicPages, origin, publicPages } from './seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return indexPublicPages
    ? Object.keys(publicPages).map((path) => ({ url: new URL(path, origin).href }))
    : [];
}
