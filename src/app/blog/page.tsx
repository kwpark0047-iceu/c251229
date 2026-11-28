import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, CalendarDays, ExternalLink, MessageCircle, Train } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { getNaverBlogFeed, NAVER_BLOG_URL, type NaverBlogPost } from '@/lib/naver-blog';
import { origin, publicMetadata, publicSchema } from '../seo';

export const metadata: Metadata = publicMetadata('/blog');

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
});

function formatDate(date: string) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? date : dateFormatter.format(value);
}

function PostCard({ post, featured = false }: { post: NaverBlogPost; featured?: boolean }) {
  return (
    <article className={`glass-card group flex h-full flex-col overflow-hidden ${featured ? 'lg:grid lg:grid-cols-[0.9fr_1.1fr]' : ''}`}>
      <div className={`relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-blue-500/25 via-emerald-500/10 to-orange-500/20 ${featured ? 'min-h-56 lg:min-h-full lg:border-b-0 lg:border-r' : 'h-40'}`}>
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_25%_25%,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {post.category}
        </div>
        <Train className="absolute -bottom-7 -right-5 h-36 w-36 rotate-[-8deg] text-white/10 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
      </div>

      <div className={`flex flex-1 flex-col ${featured ? 'p-7 md:p-10' : 'p-6'}`}>
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
        <h2 className={`${featured ? 'text-2xl md:text-3xl' : 'text-xl'} mb-4 font-bold leading-snug text-white transition-colors group-hover:text-blue-300`}>
          {post.title}
        </h2>
        <p className="mb-6 line-clamp-3 text-sm leading-7 text-gray-400">{post.excerpt}</p>
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
          aria-label={`${post.title} 원문 읽기 (새 창)`}
        >
          네이버 블로그에서 읽기
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default async function BlogPage() {
  const feed = await getNaverBlogFeed();
  const posts = feed?.posts ?? [];
  const [featuredPost, ...morePosts] = posts;
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '위마켓 광고 블로그 최신 글',
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: post.link,
      name: post.title,
    })),
  }).replace(/</g, '\\u003c');

  return (
    <div className="min-h-screen bg-void">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: publicSchema('/blog') }} />
      {posts.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />}

      <nav className="header-blur sticky top-0 z-50 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="위마켓 광고 홈">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg transition-transform group-hover:scale-105">
              <Train className="h-[22px] w-[22px] text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-xl tracking-tight text-white md:text-2xl">WE MARKET</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/contact" className="metro-btn-ghost px-4 py-2 text-sm">광고 상담</Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-20 md:px-6 md:pb-24 md:pt-28">
          <div className="gradient-orb orb-blue -left-48 top-0 h-[460px] w-[460px] opacity-20" />
          <div className="gradient-orb orb-green -right-48 top-28 h-[520px] w-[520px] opacity-15" />
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              현장에서 전하는 광고와 상권 이야기
            </div>
            <h1 className="text-display-lg mb-7">
              데이터 너머의 인사이트,<br />
              <span className="text-gradient-metro">위마켓 광고 블로그</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-8 text-gray-400 md:text-lg">
              지하철·옥외광고 집행 사례부터 지역 상권과 위마켓 소식까지,
              실무에 도움이 되는 최신 콘텐츠를 한곳에서 만나보세요.
            </p>
          </div>
        </section>

        <section className="px-5 pb-24 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-semibold text-emerald-400">LATEST STORIES</p>
                <h2 className="text-2xl font-bold text-white md:text-3xl">최근 발행한 글</h2>
              </div>
              <a href={NAVER_BLOG_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white">
                네이버 블로그 전체보기
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            {featuredPost ? (
              <>
                <div className="mb-7"><PostCard post={featuredPost} featured /></div>
                <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                  {morePosts.map((post) => <PostCard key={post.link} post={post} />)}
                </div>
              </>
            ) : (
              <div className="glass-card flex flex-col items-center px-6 py-16 text-center">
                <MessageCircle className="mb-5 h-10 w-10 text-blue-400" aria-hidden="true" />
                <h2 className="mb-3 text-xl font-bold text-white">블로그 글을 불러오지 못했습니다</h2>
                <p className="mb-7 text-gray-400">잠시 후 다시 시도하거나 네이버 블로그에서 최신 글을 확인해 주세요.</p>
                <a href={NAVER_BLOG_URL} target="_blank" rel="noopener noreferrer" className="metro-btn-primary px-6 py-3">네이버 블로그 방문하기</a>
              </div>
            )}

            <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 text-sm leading-7 text-gray-400">
              이 페이지는 공개 RSS의 제목과 요약을 보기 좋게 모아 제공합니다. 글의 저작권은 원 작성자에게 있으며,
              전체 내용은 각 카드의 원문 링크에서 확인할 수 있습니다.
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <Link href="/" className="font-display text-lg text-white">WE MARKET</Link>
          <p className="text-sm text-gray-500">광고 매체와 지역 비즈니스를 데이터로 연결합니다.</p>
          <a href={`${origin}/contact`} className="text-sm font-semibold text-blue-400 hover:text-blue-300">광고 상담하기</a>
        </div>
      </footer>
    </div>
  );
}
