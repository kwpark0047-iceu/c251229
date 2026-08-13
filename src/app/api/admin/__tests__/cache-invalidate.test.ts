/**
 * @jest-environment node
 */
import { POST } from '../cache/invalidate/route'
import { getSessionUser } from '@/lib/utils/auth'
import { cacheService } from '@/lib/services/cache/cache-service'

jest.mock('@/lib/utils/auth', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    deleteByPattern: jest.fn().mockResolvedValue(undefined),
  },
}))

const mockGetSessionUser = getSessionUser as jest.Mock
const mockDeleteByPattern = (cacheService.deleteByPattern as unknown as jest.Mock)

const adminUser = {
  id: 'u1',
  email: 'admin@test.dev',
  name: 'Admin',
  role: 'ADMIN',
  phone: null,
  phoneVerified: false,
}

const regularUser = { ...adminUser, id: 'u2', role: 'USER' }

function makeRequest(body: string | undefined): Request {
  return new Request('http://localhost/api/admin/cache/invalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

describe('POST /api/admin/cache/invalidate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionUser.mockResolvedValue(adminUser)
  })

  it('returns 401 when no user is authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const res = await POST(makeRequest(JSON.stringify({ pattern: 'all' })))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toMatchObject({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' })
    expect(mockDeleteByPattern).not.toHaveBeenCalled()
  })

  it('returns 401 when the user is not an ADMIN', async () => {
    mockGetSessionUser.mockResolvedValue(regularUser)

    const res = await POST(makeRequest(JSON.stringify({ pattern: 'all' })))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toMatchObject({ success: false, error: 'Unauthorized' })
  })

  it('defaults to clearing everything when pattern is omitted', async () => {
    const res = await POST(makeRequest(JSON.stringify({})))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockDeleteByPattern).toHaveBeenCalledWith('*')
    expect(body).toEqual({
      success: true,
      data: {
        pattern: 'all',
        patternGlob: '*',
        message: 'Cache pattern "all" cleared successfully.',
      },
    })
  })

  it('defaults to clearing everything when the body is not valid JSON', async () => {
    const res = await POST(makeRequest('{not-json'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockDeleteByPattern).toHaveBeenCalledWith('*')
    expect(body.data).toMatchObject({ pattern: 'all', patternGlob: '*' })
  })

  it.each([
    ['financial', 'financial:*'],
    ['articles', 'articles:*'],
    ['ai-it', 'ai-it:*'],
    ['crypto', 'crypto:*'],
    ['stock', 'stock:*'],
    ['forex', 'forex:*'],
    ['global', 'global:*'],
  ])('maps pattern key %s to glob %s', async (patternKey, patternGlob) => {
    const res = await POST(makeRequest(JSON.stringify({ pattern: patternKey })))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockDeleteByPattern).toHaveBeenCalledWith(patternGlob)
    expect(body.data).toEqual({
      pattern: patternKey,
      patternGlob,
      message: `Cache pattern "${patternKey}" cleared successfully.`,
    })
  })

  it('returns 400 for an unknown pattern key and does not clear anything', async () => {
    const res = await POST(makeRequest(JSON.stringify({ pattern: 'bogus' })))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toMatchObject({ success: false, code: 'BAD_REQUEST' })
    expect(body.error).toContain('Unknown pattern key: bogus')
    expect(mockDeleteByPattern).not.toHaveBeenCalled()
  })

  it('returns 500 when cache deletion throws', async () => {
    mockDeleteByPattern.mockRejectedValue(new Error('redis down'))

    const res = await POST(makeRequest(JSON.stringify({ pattern: 'all' })))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toMatchObject({
      success: false,
      error: 'Failed to invalidate cache',
      code: 'INTERNAL_ERROR',
    })
  })
})
