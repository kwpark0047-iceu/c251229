import { PrismaClient } from '@prisma/client'

// Mock Prisma client before importing the module
const mockPrisma = {
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
  $transaction: jest.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
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
          language: 'en',
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
          language: 'en',
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
          thumbnail: null,
          publishedAt: new Date('2024-01-15T10:30:00Z'),
          sourceId: 'source-1',
          sourceType: 'AI_IT' as const,
          categoryId: 'cat-1',
          language: 'en',
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
        sourceType: 'AI_IT',
        language: 'en',
      })

      expect(result.articles).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceType: 'AI_IT',
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
      mockPrisma.article.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // read
        .mockResolvedValueOnce(20) // bookmarked
        .mockResolvedValueOnce(5) // breaking
      mockPrisma.article.groupBy.mockResolvedValue([
        { sourceId: 'source-1', _count: { sourceId: 50 } },
        { sourceId: 'source-2', _count: { sourceId: 50 } },
      ])

      const stats = await getAIITArticleStats()

      expect(stats).toEqual({
        total: 100,
        read: 80,
        unread: 20,
        bookmarked: 20,
        breaking: 5,
        bySource: [
          { sourceId: 'source-1', count: 50 },
          { sourceId: 'source-2', count: 50 },
        ],
      })
    })
  })

  describe('getSubcategoriesWithCount', () => {
    it('returns subcategories with article counts', async () => {
      mockPrisma.article.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _count: { categoryId: 30 } },
        { categoryId: 'cat-2', _count: { categoryId: 20 } },
      ])
      mockPrisma.newsCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'OpenAI', nameEn: 'openai', type: 'official_ai' },
        { id: 'cat-2', name: 'Google AI', nameEn: 'google_ai', type: 'official_ai' },
      ])

      const result = await getSubcategoriesWithCount('ai')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        categoryId: 'cat-1',
        categoryName: 'OpenAI',
        categoryNameEn: 'openai',
        count: 30,
      })
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
        difficulty: 'intermediate',
        aiGenerated: true,
        modelUsed: 'gpt-4o-mini',
      }

      mockPrisma.newsSummary.upsert.mockResolvedValue(mockSummary)

      const result = await upsertSummary('art-1', mockSummary)

      expect(result).toEqual(mockSummary)
      expect(mockPrisma.newsSummary.upsert).toHaveBeenCalledWith({
        where: { articleId: 'art-1' },
        update: mockSummary,
        create: expect.objectContaining({
          articleId: 'art-1',
          ...mockSummary,
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
      mockPrisma.newsTagRelation.create.mockResolvedValue({ articleId: 'art-1', tagId: 'tag-1' })

      await addTagsToNews('art-1', ['GPT-4', 'OpenAI'])

      expect(mockPrisma.newsTag.upsert).toHaveBeenCalledTimes(2)
      expect(mockPrisma.newsTagRelation.create).toHaveBeenCalledTimes(2)
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

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'tag-1',
        name: 'GPT-4',
        nameEn: 'gpt-4',
        type: 'model',
        color: '#ff0000',
      })
    })
  })

  describe('getPopularTags', () => {
    it('returns popular tags with counts', async () => {
      mockPrisma.newsTagRelation.groupBy.mockResolvedValue([
        { tagId: 'tag-1', _count: { tagId: 50 } },
        { tagId: 'tag-2', _count: { tagId: 30 } },
      ])
      mockPrisma.newsTag.findMany.mockResolvedValue([
        { id: 'tag-1', name: 'GPT-4', nameEn: 'gpt-4', type: 'model', color: '#ff0000' },
        { id: 'tag-2', name: 'OpenAI', nameEn: 'openai', type: 'company', color: '#00ff00' },
      ])

      const result = await getPopularTags(10)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'tag-1',
        name: 'GPT-4',
        nameEn: 'gpt-4',
        type: 'model',
        color: '#ff0000',
        count: 50,
      })
    })
  })

  // ============================================================================
  // Source Functions
  // ============================================================================

  describe('seedAIITSources', () => {
    it('seeds default AI/IT sources', async () => {
      mockPrisma.source.upsert.mockResolvedValue({} as any)

      await seedAIITSources()

      expect(mockPrisma.source.upsert).toHaveBeenCalled()
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
      const mockSource = { id: 'source-1', name: 'OpenAI Blog', nameEn: 'openai_blog' }
      mockPrisma.source.upsert.mockResolvedValue(mockSource)

      const result = await upsertAIITSource({
        name: 'OpenAI Blog',
        nameEn: 'openai_blog',
        url: 'https://openai.com/blog',
        category: 'ai',
        subcategory: 'official_ai',
      })

      expect(result).toEqual(mockSource)
      expect(mockPrisma.source.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nameEn: 'openai_blog' },
        })
      )
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
      const mockLog = { id: 'log-1', sourceId: 'source-1', status: 'success', count: 10 }
      mockPrisma.fetchLog.create.mockResolvedValue(mockLog)

      const result = await logAIITFetch({
        sourceId: 'source-1',
        status: 'success',
        count: 10,
        newCount: 5,
        duration: 1500,
      })

      expect(result).toEqual(mockLog)
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