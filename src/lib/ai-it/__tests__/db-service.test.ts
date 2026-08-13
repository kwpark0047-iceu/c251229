// Mock Prisma client before importing the module
type MockPrisma = {
  article: Record<string, jest.Mock>
  source: Record<string, jest.Mock>
  newsSummary: Record<string, jest.Mock>
  newsCategory: Record<string, jest.Mock>
  newsTag: Record<string, jest.Mock>
  newsTagRelation: Record<string, jest.Mock>
  fetchLog: Record<string, jest.Mock>
  distributedLock: Record<string, jest.Mock>
  priceHistory: Record<string, jest.Mock>
  cryptoCandle: Record<string, jest.Mock>
  globalIndexQuote: Record<string, jest.Mock>
  $transaction: jest.Mock
  $queryRaw: jest.Mock
}

const mockPrisma: MockPrisma = {
  article: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn(),
  },
  source: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  newsSummary: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  newsCategory: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  newsTag: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  newsTagRelation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  fetchLog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  distributedLock: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  priceHistory: {
    deleteMany: jest.fn(),
  },
  cryptoCandle: {
    deleteMany: jest.fn(),
  },
  globalIndexQuote: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: MockPrisma) => Promise<unknown>) => fn(mockPrisma)),
  $queryRaw: jest.fn(),
}

// SWC doesn't hoist jest.mock factories above `const mockPrisma`, so direct
// references would hit the TDZ at require time; getters defer evaluation.
// `__esModule: true` lets the default-import interop resolve to the getter
// instead of wrapping the factory object itself.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  get prisma() {
    return mockPrisma
  },
  get default() {
    return mockPrisma
  },
}))

// Mock cache-service
jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

jest.mock('@/lib/utils', () => ({
  sendNotificationWebhook: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/rss/db-service', () => ({
  scheduleTranslation: jest.fn(),
}))

jest.mock('@/lib/ai-it/sources', () => ({
  ALL_AIIT_SOURCES: [
    {
      name: 'OpenAI Blog',
      nameEn: 'openai_blog',
      url: 'https://openai.com/blog',
      category: 'ai',
      subcategory: 'llm',
      language: 'en',
      icon: '',
      fetchInterval: 60,
      type: 'rss',
      crawlerConfig: undefined,
    },
  ],
}))

// Import after mocks
import {
  upsertAIITArticles,
  getAIITArticles,
  getAIITArticleById,
  getRelatedAIITArticles,
  getAIITArticleByUrl,
  markAsRead,
  toggleBookmark,
  getRecentArticlesBySource,
  getAIITArticleStats,
  getSubcategoriesWithCount,
  upsertSummary,
  getSummaryByNewsId,
  getSummariesForNews,
  addTagsToNews,
  getTagsForNews,
  getPopularTags,
  seedAIITSources,
  getAIITSourceByNameEn,
  upsertAIITSource,
  getActiveAIITSources,
  logAIITFetch,
  getRecentFetchLogs,
} from '@/lib/ai-it/db-service'

describe('ai-it/db-service', () => {
  const originalEnv = { ...process.env }

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'a'.repeat(32),
      CRON_SECRET: 'b'.repeat(32),
      LLM_PROVIDER: 'mock',
      DISABLE_SCHEDULERS: '1',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ============================================================================
  // Article Functions
  // ============================================================================

  describe('upsertAIITArticles', () => {
    it('upserts articles and returns count', async () => {
      const articles = [
        {
          guid: 'guid-1',
          title: 'Test Article 1',
          url: 'https://example.com/1',
          description: 'Description 1',
          content: 'Content 1',
          author: 'Author 1',
          thumbnail: 'https://example.com/1.jpg',
          publishedAt: new Date('2024-01-15T10:30:00Z'),
          sourceId: 'source-1',
          sourceType: 'AI_IT' as const,
          categoryId: 'cat-1',
          language: 'en' as const,
          sourceNameEn: 'openai_blog',
        },
        {
          guid: 'guid-2',
          title: 'Test Article 2',
          url: 'https://example.com/2',
          description: 'Description 2',
          content: 'Content 2',
          author: 'Author 2',
          thumbnail: 'https://example.com/2.jpg',
          publishedAt: new Date('2024-01-15T11:30:00Z'),
          sourceId: 'source-1',
          sourceType: 'AI_IT' as const,
          categoryId: 'cat-1',
          language: 'en' as const,
          sourceNameEn: 'openai_blog',
        },
      ]

      mockPrisma.article.findUnique.mockResolvedValue(null)
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1',
        source: { name: 'Test Source' },
      })

      const count = await upsertAIITArticles('source-1', articles)

      expect(count).toEqual({ newCount: 2, totalCount: 2 })
      expect(mockPrisma.article.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.article.create).toHaveBeenCalledTimes(2)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { url: 'https://example.com/1' },
      })
      expect(mockPrisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceId: 'source-1',
            sourceType: 'AI_IT',
            guid: 'guid-1',
            url: 'https://example.com/1',
          }),
        })
      )
    })

    it('handles empty array', async () => {
      const count = await upsertAIITArticles('source-1', [])

      expect(count).toEqual({ newCount: 0, totalCount: 0 })
      expect(mockPrisma.article.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.article.create).not.toHaveBeenCalled()
    })

    it('handles articles without guid (uses url as fallback)', async () => {
      const articles = [
        {
          title: 'Test Article',
          url: 'https://example.com/1',
          description: 'Description',
          content: 'Content',
          author: 'Author',
          publishedAt: new Date('2024-01-15T10:30:00Z'),
          sourceId: 'source-1',
          sourceType: 'AI_IT' as const,
          categoryId: 'cat-1',
          language: 'en' as const,
          sourceNameEn: 'openai_blog',
        },
      ]

      mockPrisma.article.findUnique.mockResolvedValue(null)
      mockPrisma.article.create.mockResolvedValue({
        id: 'art-1',
        source: { name: 'Test Source' },
      })

      const count = await upsertAIITArticles('source-1', articles)

      expect(count).toEqual({ newCount: 1, totalCount: 1 })
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { url: 'https://example.com/1' },
      })
      expect(mockPrisma.article.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAIITArticles', () => {
    it('returns paginated articles with filters', async () => {
      const mockArticles = [
        {
          id: 'art-1',
          guid: 'guid-1',
          title: 'Test Article 1',
          url: 'https://example.com/1',
          description: 'Desc 1',
          content: 'Content 1',
          author: 'Author 1',
          thumbnail: 'https://example.com/1.jpg',
          publishedAt: new Date('2024-01-15T10:30:00Z'),
          sourceId: 'source-1',
          sourceType: 'AI_IT',
          categoryId: 'cat-1',
          language: 'en',
          isRead: false,
          isBookmarked: false,
          viewCount: 10,
          source: { id: 'source-1', name: 'Test Source', nameEn: 'test_source', icon: '🧪' },
          categoryRef: { id: 'cat-1', name: 'OpenAI', nameEn: 'openai', type: 'official_ai' },
          tags: [],
          summary: null,
        },
      ]

      mockPrisma.article.findMany.mockResolvedValue(mockArticles)
      mockPrisma.article.count.mockResolvedValue(1)

      const result = await getAIITArticles({
        page: 1,
        limit: 10,
        language: 'en',
      })

      expect(result.articles).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: expect.objectContaining({
              sourceType: 'AI_IT',
            }),
            language: 'en',
          }),
          orderBy: { publishedAt: 'desc' },
          skip: 0,
          take: 10,
        })
      )
    })

    it('applies all filter combinations', async () => {
      mockPrisma.article.findMany.mockResolvedValue([])
      mockPrisma.article.count.mockResolvedValue(0)

      await getAIITArticles({
        page: 2,
        limit: 20,
        sourceId: 'source-1',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        search: 'test',
        sortBy: 'viewCount',
        sortOrder: 'asc',
      })

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { source: true },
          where: expect.objectContaining({
            source: {
              id: 'source-1',
              sourceType: 'AI_IT',
            },
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'test' } }),
              expect.objectContaining({ description: { contains: 'test' } }),
              expect.objectContaining({ content: { contains: 'test' } }),
            ]),
            publishedAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
          orderBy: { publishedAt: 'asc' },
          skip: 20,
          take: 20,
        })
      )
    })
  })

  describe('getAIITArticleById', () => {
    it('returns article with all relations', async () => {
      const mockArticle = {
        id: 'art-1',
        title: 'Test Article',
        url: 'https://example.com/1',
        source: { id: 'source-1', name: 'Test Source' },
        categoryRef: { id: 'cat-1', name: 'OpenAI' },
        tags: [{ tag: { id: 'tag-1', name: 'GPT-4' } }],
        summary: { id: 'sum-1', summary3Line: 'Summary' },
      }

      mockPrisma.article.findUnique.mockResolvedValue(mockArticle)

      const result = await getAIITArticleById('art-1')

      expect(result).toEqual(mockArticle)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        include: expect.objectContaining({
          source: true,
          tags: { include: { tag: true } },
          summary: true,
        }),
      })
    })

    it('returns null for non-existent article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null)

      const result = await getAIITArticleById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getRelatedAIITArticles', () => {
    it('returns related articles by category and tags', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        sourceId: 'source-1',
        summary: { keywords: ['AI'] },
      })
      mockPrisma.article.findMany.mockResolvedValue([
        { id: 'art-2', sourceId: 'source-1' },
        { id: 'art-3', sourceId: 'source-1' },
      ])

      const result = await getRelatedAIITArticles('art-1', 5)

      expect(result).toHaveLength(2)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        include: { summary: true },
      })
    })
  })

  describe('getAIITArticleByUrl', () => {
    it('returns article by url', async () => {
      const mockArticle = { id: 'art-1', url: 'https://example.com/1' }
      mockPrisma.article.findUnique.mockResolvedValue(mockArticle)

      const result = await getAIITArticleByUrl('https://example.com/1')

      expect(result).toEqual(mockArticle)
      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { url: 'https://example.com/1' },
        include: { source: true },
      })
    })
  })

  describe('markAsRead', () => {
    it('marks article as read', async () => {
      mockPrisma.article.update.mockResolvedValue({ id: 'art-1', isRead: true })

      const result = await markAsRead('art-1')

      expect(result).toBeUndefined()
      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { isRead: true },
      })
    })
  })

  describe('toggleBookmark', () => {
    it('toggles bookmark status', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', isBookmarked: false })
      mockPrisma.article.update.mockResolvedValue({ id: 'art-1', isBookmarked: true })

      const result = await toggleBookmark('art-1')

      expect(result).toBe(true)
      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { isBookmarked: true },
      })
    })
  })

  describe('getRecentArticlesBySource', () => {
    it('returns recent articles for source', async () => {
      const mockArticles = [
        { id: 'art-1', title: 'Recent 1', sourceId: 'source-1' },
        { id: 'art-2', title: 'Recent 2', sourceId: 'source-1' },
      ]
      mockPrisma.article.findMany.mockResolvedValue(mockArticles)

      const result = await getRecentArticlesBySource('source-1', 10)

      expect(result).toHaveLength(2)
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
        where: { sourceId: 'source-1' },
        include: { source: true },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      })
    })
  })

  describe('getAIITArticleStats', () => {
    it('returns article statistics', async () => {
      mockPrisma.article.count.mockResolvedValue(100)
      mockPrisma.source.count.mockResolvedValue(5)
      mockPrisma.fetchLog.findFirst.mockResolvedValue({ fetchedAt: new Date() })
      mockPrisma.article.groupBy.mockResolvedValue([{ _count: { articleId: 3 } }])

      const stats = await getAIITArticleStats()

      expect(stats).toEqual(
        expect.objectContaining({
          totalArticles: 100,
          totalSources: 5,
          lastFetchAt: expect.any(Date),
          topSources: expect.any(Array),
          articlesByCategory: expect.any(Array),
          articlesByLanguage: expect.any(Array),
        })
      )
    })
  })

  describe('getSubcategoriesWithCount', () => {
    it('returns subcategories with article counts', async () => {
      mockPrisma.source.findMany.mockResolvedValue([
        { id: 's1', subcategory: 'official_ai' },
        { id: 's2', subcategory: 'official_ai' },
        { id: 's3', subcategory: null },
        { id: 's4', subcategory: 'research' },
      ])
      mockPrisma.article.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20)
        .mockResolvedValue(10)

      const result = await getSubcategoriesWithCount('ai')

      expect(result).toEqual([
        { subcategory: 'official_ai', count: 50 },
        { subcategory: 'research', count: 10 },
      ])
    })
  })

  // ============================================================================
  // Summary Functions
  // ============================================================================

  describe('upsertSummary', () => {
    it('creates or updates summary', async () => {
      const mockSummary = {
        articleId: 'art-1',
        translatedTitle: 'Translated Title',
        summary3Line: '3 line summary',
        keywords: ['AI', 'GPT-4'],
        relatedCompanies: ['OpenAI'],
        relatedModels: ['GPT-4'],
        difficulty: 'intermediate' as const,
      }

      mockPrisma.newsSummary.upsert.mockResolvedValue(mockSummary)

      const result = await upsertSummary('art-1', mockSummary)

      expect(result).toEqual(mockSummary)
      expect(mockPrisma.newsSummary.upsert).toHaveBeenCalledWith({
        where: { articleId: 'art-1' },
        update: expect.objectContaining({
          translatedTitle: 'Translated Title',
          summary3Line: '3 line summary',
          keywords: ['AI', 'GPT-4'],
          relatedCompanies: ['OpenAI'],
          relatedModels: ['GPT-4'],
          difficulty: 'intermediate',
        }),
        create: expect.objectContaining({
          ...mockSummary,
          articleId: 'art-1',
        }),
      })
    })
  })

  describe('getSummaryByNewsId', () => {
    it('returns summary for article', async () => {
      const mockSummary = { id: 'sum-1', articleId: 'art-1', summary3Line: 'Summary' }
      mockPrisma.newsSummary.findUnique.mockResolvedValue(mockSummary)

      const result = await getSummaryByNewsId('art-1')

      expect(result).toEqual(mockSummary)
      expect(mockPrisma.newsSummary.findUnique).toHaveBeenCalledWith({
        where: { articleId: 'art-1' },
      })
    })
  })

  describe('getSummariesForNews', () => {
    it('returns multiple summaries', async () => {
      const mockSummaries = [
        { articleId: 'art-1', summary3Line: 'Summary 1' },
        { articleId: 'art-2', summary3Line: 'Summary 2' },
      ]
      mockPrisma.newsSummary.findMany.mockResolvedValue(mockSummaries)

      const result = await getSummariesForNews(['art-1', 'art-2'])

      expect(result).toHaveLength(2)
      expect(mockPrisma.newsSummary.findMany).toHaveBeenCalledWith({
        where: { articleId: { in: ['art-1', 'art-2'] } },
      })
    })
  })

  // ============================================================================
  // Tag Functions
  // ============================================================================

  describe('addTagsToNews', () => {
    it('adds tags to article', async () => {
      mockPrisma.newsTagRelation.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.newsTag.upsert.mockResolvedValue({ id: 'tag-1', name: 'GPT-4' })
      mockPrisma.newsTagRelation.upsert.mockResolvedValue({ articleId: 'art-1', tagId: 'tag-1' })

      await addTagsToNews('art-1', ['GPT-4', 'OpenAI'])

      expect(mockPrisma.newsTag.upsert).toHaveBeenCalledTimes(2)
      expect(mockPrisma.newsTagRelation.upsert).toHaveBeenCalledTimes(2)
    })
  })

  describe('getTagsForNews', () => {
    it('returns tags for article', async () => {
      const mockTags = [
        { tag: { id: 'tag-1', name: 'GPT-4', nameEn: 'gpt-4', type: 'model', color: '#ff0000' } },
        { tag: { id: 'tag-2', name: 'OpenAI', nameEn: 'openai', type: 'company', color: '#00ff00' } },
      ]
      mockPrisma.newsTagRelation.findMany.mockResolvedValue(mockTags)

      const result = await getTagsForNews('art-1')

      expect(result).toEqual(['GPT-4', 'OpenAI'])
    })
  })

  describe('getPopularTags', () => {
    it('returns popular tags with counts', async () => {
      mockPrisma.newsTag.findMany.mockResolvedValue([
        { name: 'GPT-4', _count: { articles: 50 } },
        { name: 'OpenAI', _count: { articles: 30 } },
      ])

      const result = await getPopularTags(10)

      expect(result).toEqual([
        { name: 'GPT-4', count: 50 },
        { name: 'OpenAI', count: 30 },
      ])
    })
  })

  // ============================================================================
  // Source Functions
  // ============================================================================

  describe('seedAIITSources', () => {
    it('seeds default AI/IT sources', async () => {
      mockPrisma.source.findUnique.mockResolvedValue(null)
      mockPrisma.source.create.mockResolvedValue({ id: 'source-1' })

      await seedAIITSources()

      expect(mockPrisma.source.create).toHaveBeenCalled()
    })
  })

  describe('getAIITSourceByNameEn', () => {
    it('returns source by nameEn', async () => {
      const mockSource = { id: 'source-1', nameEn: 'openai_blog', name: 'OpenAI Blog' }
      mockPrisma.source.findUnique.mockResolvedValue(mockSource)

      const result = await getAIITSourceByNameEn('openai_blog')

      expect(result).toEqual(mockSource)
      expect(mockPrisma.source.findUnique).toHaveBeenCalledWith({
        where: { nameEn: 'openai_blog' },
      })
    })
  })

  describe('upsertAIITSource', () => {
    it('creates or updates source', async () => {
      mockPrisma.source.findUnique.mockResolvedValue(null)
      mockPrisma.source.create.mockResolvedValue({ id: 'source-1' })

      const result = await upsertAIITSource({
        name: 'OpenAI Blog',
        nameEn: 'openai_blog',
        url: 'https://openai.com/blog',
        category: 'ai',
        subcategory: 'official_ai',
        language: 'en',
      })

      expect(result).toBe('source-1')
      expect(mockPrisma.source.findUnique).toHaveBeenCalledWith({
        where: { nameEn: 'openai_blog' },
      })
    })
  })

  describe('getActiveAIITSources', () => {
    it('returns active AI/IT sources', async () => {
      const mockSources = [
        { id: 'source-1', name: 'OpenAI Blog', sourceType: 'AI_IT', isActive: true },
        { id: 'source-2', name: 'Google AI Blog', sourceType: 'AI_IT', isActive: true },
      ]
      mockPrisma.source.findMany.mockResolvedValue(mockSources)

      const result = await getActiveAIITSources()

      expect(result).toHaveLength(2)
      expect(mockPrisma.source.findMany).toHaveBeenCalledWith({
        where: { sourceType: 'AI_IT', isActive: true },
        orderBy: { name: 'asc' },
      })
    })
  })

  // ============================================================================
  // Fetch Log Functions
  // ============================================================================

  describe('logAIITFetch', () => {
    it('creates fetch log entry', async () => {
      mockPrisma.fetchLog.create.mockResolvedValue({ id: 'log-1' })

      await logAIITFetch('source-1', 'success', 10, 5, 1500)
      expect(mockPrisma.fetchLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceId: 'source-1',
          status: 'success',
          count: 10,
          newCount: 5,
          duration: 1500,
        }),
      })
    })
  })

  describe('getRecentFetchLogs', () => {
    it('returns recent fetch logs', async () => {
      const mockLogs = [
        { id: 'log-1', sourceId: 'source-1', status: 'success', fetchedAt: new Date() },
        { id: 'log-2', sourceId: 'source-2', status: 'error', fetchedAt: new Date() },
      ]
      mockPrisma.fetchLog.findMany.mockResolvedValue(mockLogs)

      const result = await getRecentFetchLogs('source-1', 20)

      expect(result).toHaveLength(2)
      expect(mockPrisma.fetchLog.findMany).toHaveBeenCalledWith({
        where: { sourceId: 'source-1' },
        include: { source: true },
        orderBy: { fetchedAt: 'desc' },
        take: 20,
      })
    })
  })
})