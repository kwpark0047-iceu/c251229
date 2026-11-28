import HomeContent from './HomeContent';
import { publicMetadata, publicSchema } from './seo';

export const metadata = publicMetadata('/');

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: publicSchema('/') }} />
      <HomeContent />
    </>
  );
}
