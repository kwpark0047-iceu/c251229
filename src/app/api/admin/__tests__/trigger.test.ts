/**
 * @jest-environment node
 */
import { POST } from '../trigger/route'
import { getSessionUser } from '@/lib/utils/auth'
import { runRssFetch } from '@/lib/rss/scheduler'
import { fetchAndProcessSource } from '@/lib/ai-it/scheduler-service'
import prisma from '@/lib/db'

jest.mock('@/lib/utils/auth', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    source: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/rss/scheduler', () => ({
  runRssFetch: jest.fn(),
}))

jest.mock('@/lib/ai-it/scheduler-service', () => ({
  fetchAndProcessSource: jest.fn(),
}))

const mockGetSessionUser = getSessionUser as jest.Mock
const mockFindUnique = (prisma.source.findUnique as unknown as jest.Mock)
const mockRunRssFetch = runRssFetch as jest.Mock
const mockFetchAndProcessSource = fetchAndProcessSource as jest.Mock

const adminUser = {
  id: 'u1',
  email: 'admin@test.dev',
  name: 'Admin',
  role: 'ADMIN',
  phone: null,
  phoneVerified: false,
}

const regularUser = { ...adminUser, id: 'u2', role: 'USER' }

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/trigger', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionUser.mockResolvedValue(adminUser)
  })

  it('returns 401 when no user is authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const res = await POST(makeRequest({ sourceId: 'src-1' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toMatchObject({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 401 when the user is not an ADMIN', async () => {
    mockGetSessionUser.mockResolvedValue(regularUser)

    const res = await POST(makeRequest({ sourceId: 'src-1' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toMatchObject({ success: false, error: 'Unauthorized' })
  })

  it('returns 400 when sourceId is missing', async () => {
    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toMatchObject({ success: false, error: 'Source ID is required', code: 'BAD_REQUEST' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when the source does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest({ sourceId: 'missing' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toMatchObject({ success: false, error: 'Source not found in DB', code: 'NOT_FOUND' })
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'missing' } })
  })

  it('returns 500 when the DB lookup throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const res = await POST(makeRequest({ sourceId: 'src-1' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: 'Failed to execute manual fetch trigger',
      code: 'INTERNAL_ERROR',
    })
  })

  describe('RSS sources', () => {
    const rssSource = { id: 'src-1', nameEn: 'hankyung', sourceType: 'RSS' }

    it('returns the first RSS fetch result on success', async () => {
      mockFindUnique.mockResolvedValue(rssSource)
      const fetchResult = {
        source: '한국경제',
        status: 'success' as const,
        error: undefined,
        duration: 123,
      }
      mockRunRssFetch.mockResolvedValue([fetchResult])

      const res = await POST(makeRequest({ sourceId: 'src-1' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ success: true, result: fetchResult })
      expect(mockRunRssFetch).toHaveBeenCalledWith('hankyung')
    })

    it('falls back to an error result when RSS returns no entries', async () => {
      mockFindUnique.mockResolvedValue(rssSource)
      mockRunRssFetch.mockResolvedValue([])

      const res = await POST(makeRequest({ sourceId: 'src-1' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({
        success: true,
        result: { status: 'error', error: 'No fetch executed' },
      })
    })
  })

  describe('AI_IT sources', () => {
    const aiItSource = { id: 'src-2', nameEn: 'openai', sourceType: 'AI_IT' }

    it('maps count/newCount into total/new on success', async () => {
      mockFindUnique.mockResolvedValue(aiItSource)
      mockFetchAndProcessSource.mockResolvedValue({ count: 3, newCount: 2, error: undefined })

      const res = await POST(makeRequest({ sourceId: 'src-2' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({
        success: true,
        result: { status: 'success', total: 3, new: 2, error: undefined },
      })
      expect(mockFetchAndProcessSource).toHaveBeenCalledWith('src-2')
    })

    it('propagates an error status when fetchAndProcessSource fails', async () => {
      mockFindUnique.mockResolvedValue(aiItSource)
      mockFetchAndProcessSource.mockResolvedValue({ count: 0, newCount: 0, error: 'fetch exploded' })

      const res = await POST(makeRequest({ sourceId: 'src-2' }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({
        success: true,
        result: { status: 'error', total: 0, new: 0, error: 'fetch exploded' },
      })
    })
  })

  it('returns 400 for an unsupported source type', async () => {
    mockFindUnique.mockResolvedValue({ id: 'src-3', nameEn: 'weird', sourceType: 'OTHER' })

    const res = await POST(makeRequest({ sourceId: 'src-3' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toMatchObject({
      success: false,
      error: 'Unsupported source type for manual trigger',
      code: 'BAD_REQUEST',
    })
  })
})
