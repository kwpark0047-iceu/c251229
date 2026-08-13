import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import WeatherWidget from '@/components/layout/WeatherWidget'
import { getArticles, getBreakingArticles } from '@/lib/rss/db-service'
import { NewsletterWidget } from '@/components/ui/NewsletterWidget'
import PopularArticles from '@/components/news/PopularArticles'
import { BannerDisplay } from '@/components/ui/BannerDisplay'
import { SidebarAds } from '@/components/ui/SidebarAds'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '경제 뉴스 - 국내외 경제/AI/IT 실시간 뉴스',
  description: '한국경제, 매일경제, 연준(Fed) 등 국내외 경제 뉴스와 AI/IT 최신 소식을 실시간으로 확인하세요.',
}

interface HomePageProps {
  searchParams: Promise<{ page?: string; language?: string; search?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const language = params.language
  const search = params.search

  const [{ articles, total, totalPages }, { articles: breakingArticles }] = await Promise.all([
    getArticles({
      language,
      page,
      limit: 20,
      search,
    }),
    getBreakingArticles(5, 1),
  ])

  return (
    <CategoryPageLayout
      title="전체 뉴스"
      description={
        <>
          국내외 경제 뉴스를 한 곳에서
          {language && (
            <span className="ml-2 inline-flex rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
              {language === 'ko' ? '국내만' : '해외만'}
            </span>
          )}
          {search && (
            <span className="ml-2 inline-flex rounded-sm bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary">
              검색: {search}
            </span>
          )}
        </>
      }
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/"
      extraSearchParams={{ language, search }}
      weatherWidget={<WeatherWidget />}
      newsletterWidget={<NewsletterWidget />}
      financialDashboard={<FinancialDashboard />}
      sidebarAds={<SidebarAds />}
      banners={<><BannerDisplay position="top" /><BannerDisplay position="bottom" /></>}
      popularArticles={<PopularArticles />}
    >
      {breakingArticles.length > 0 && (
        <section aria-label="속보" className="mb-6">
          <div className="rounded-sm border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-red-600 dark:text-red-400">🚨 속보</span>
              <Link
                href="/breaking"
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                전체보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {breakingArticles.map((article) => (
                <div key={article.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                  <Link
                    href={`/articles/${article.id}`}
                    className="text-sm font-medium text-foreground hover:text-red-600 dark:hover:text-red-400 line-clamp-1"
                  >
                    {article.title}
                  </Link>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {article.source?.name ?? '제목 없음'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <NewsList articles={articles} />
    </CategoryPageLayout>
  )
}
