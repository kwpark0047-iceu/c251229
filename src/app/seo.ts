import type { Metadata } from 'next';

export const origin = 'https://wemarketad.vercel.app';
export const indexPublicPages = process.env.VERCEL_ENV === 'production';
const siteVerification = {
  google: 'Y3bwc958A-rvhkKJXuPJXFpMR8NkrE-BxjqheC1zBQM',
  naver: '26f1828834fb028978526007402ea750b5c63163',
};
export const publicPages = {
  '/': {
    name: '위마켓 광고',
    title: '서울 지하철 광고 매체와 역사 추천 | 위마켓 광고',
    description: '서울 지하철 1~8호선의 노선별 유동인구와 광고 매체를 살펴보세요. 업종, 예산과 희망 지역을 바탕으로 광고 후보 역사를 추천받고 매체 상담을 요청할 수 있습니다.',
  },
  '/contact': {
    name: '광고 상담',
    title: '지하철 광고 견적 상담과 AI 매체 추천 | 위마켓 광고',
    description: '업종, 희망 지역과 예산을 입력해 서울 지하철 광고에 적합한 역사를 알아보세요. 추천 결과를 참고해 매체와 견적에 대한 상담을 요청할 수 있습니다.',
  },
  '/blog': {
    name: '위마켓 광고 블로그',
    title: '지하철 광고·지역 상권 인사이트 블로그 | 위마켓 광고',
    description: '지하철과 옥외광고 집행 사례, 지역 상권 정보, 위마켓 소식을 한곳에서 확인하세요. 네이버 블로그의 최신 콘텐츠를 요약해 소개합니다.',
  },
} as const;

const image = {
  url: '/wemarket-ad-share.png',
  width: 1200,
  height: 630,
  alt: '위마켓 광고 서울 지하철 광고 매체와 역사 추천',
};

export function publicMetadata(path: keyof typeof publicPages): Metadata {
  const { title, description } = publicPages[path];
  const url = new URL(path, origin).href;
  const google = process.env.WEMARKET_AD_GOOGLE_SITE_VERIFICATION?.trim() || siteVerification.google;
  const naver = process.env.WEMARKET_AD_NAVER_SITE_VERIFICATION?.trim() || siteVerification.naver;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: indexPublicPages, follow: indexPublicPages },
    openGraph: {
      title, description, url, type: 'website', locale: 'ko_KR',
      siteName: '위마켓 광고', images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    ...(path === '/' && indexPublicPages && {
      verification: {
        google: google || undefined,
        other: naver ? { 'naver-site-verification': naver } : undefined,
      },
    }),
  };
}

export function publicSchema(path: keyof typeof publicPages): string {
  const { name, description } = publicPages[path];
  const url = new URL(path, origin).href;
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const breadcrumbId = `${url}#breadcrumb`;
  const home = path === '/';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': organizationId, name: '위마켓 광고',
        alternateName: 'WEMARKET AD', url: `${origin}/`,
      },
      {
        '@type': 'WebSite', '@id': websiteId, name: '위마켓 광고', url: `${origin}/`,
        inLanguage: 'ko', publisher: { '@id': organizationId },
      },
      {
        '@type': path === '/contact' ? 'ContactPage' : 'WebPage', '@id': `${url}#webpage`,
        name, url, description, inLanguage: 'ko', isPartOf: { '@id': websiteId },
        ...(home ? { mainEntity: { '@id': `${origin}/#advertising` } }
          : { breadcrumb: { '@id': breadcrumbId } }),
      },
      home ? {
        '@type': 'Service', '@id': `${origin}/#advertising`, name: '서울 지하철 광고 매체 상담',
        serviceType: '지하철 광고 매체 추천 및 상담', url: `${origin}/`,
        areaServed: { '@type': 'City', name: '서울' },
        provider: { '@id': organizationId },
      } : {
        '@type': 'BreadcrumbList', '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '위마켓 광고', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name, item: url },
        ],
      },
    ],
  }).replace(/</g, '\\u003c');
}
