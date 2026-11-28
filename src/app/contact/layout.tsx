import type { ReactNode } from 'react';
import { publicMetadata, publicSchema } from '../seo';

export const metadata = publicMetadata('/contact');

export default function AdvertisingContactLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: publicSchema('/contact') }} />
      {children}
    </>
  );
}
