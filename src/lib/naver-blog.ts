export const NAVER_BLOG_URL = 'https://blog.naver.com/kwpark0098';
const NAVER_RSS_URL = 'https://rss.blog.naver.com/kwpark0098.xml';

export type NaverBlogPost = {
  title: string;
  link: string;
  publishedAt: string;
  category: string;
  excerpt: string;
};

export type NaverBlogFeed = {
  title: string;
  description: string;
  posts: NaverBlogPost[];
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function tagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match) return '';

  const value = match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return decodeEntities(value).trim();
}

function plainText(value: string): string {
  return decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, maxLength = 180): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

export function parseNaverBlogFeed(xml: string): NaverBlogFeed {
  const channel = tagValue(xml, 'channel') || xml;
  const posts = [...channel.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      const link = tagValue(item, 'link');

      return {
        title: plainText(tagValue(item, 'title')),
        link: link.startsWith('https://blog.naver.com/kwpark0098/') ? link : NAVER_BLOG_URL,
        publishedAt: tagValue(item, 'pubDate'),
        category: plainText(tagValue(item, 'category')) || '위마켓 소식',
        excerpt: truncate(plainText(tagValue(item, 'description'))) || '네이버 블로그에서 자세한 내용을 확인해 보세요.',
      };
    })
    .filter((post) => post.title);

  return {
    title: plainText(tagValue(channel, 'title')) || '위마켓 광고 블로그',
    description: plainText(tagValue(channel, 'description')),
    posts,
  };
}

export async function getNaverBlogFeed(): Promise<NaverBlogFeed | null> {
  try {
    const response = await fetch(NAVER_RSS_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' },
    });

    if (!response.ok) return null;
    return parseNaverBlogFeed(await response.text());
  } catch {
    return null;
  }
}
