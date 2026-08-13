import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiCronCleanup')

// Cleanup configuration - uses ARTICLE_RETENTION_DAYS env var for articles
// Defaults to 90 days if not set, matching db-service.ts RETENTION_DAYS
const CLEANUP_CONFIG = {
  // Keep articles for ARTICLE_RETENTION_DAYS days (default: 90), delete older
  articleRetentionDays: parseInt(process.env.ARTICLE_RETENTION_DAYS || '90', 10),
  // Keep fetch logs for 90 days
  fetchLogRetentionDays: 90,
  // Keep financial fetch logs for 90 days
  financialFetchLogRetentionDays: 90,
  // Keep error logs for 30 days
  errorLogRetentionDays: 30,
  // Clean up expired distributed locks immediately
  expiredLocksOnly: true,
  // Keep newsletter subscriptions active (don't auto-delete)
  // Keep user data (never auto-delete)
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In production, CRON_SECRET must be set and must match
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startTime = Date.now()
    const results: Record<string, { deleted: number; duration: number }> = {}

    // 1. Delete old articles (keep last N days)
    const articleCutoff = new Date()
    articleCutoff.setDate(articleCutoff.getDate() - CLEANUP_CONFIG.articleRetentionDays)

    const articleStart = Date.now()
    const deletedArticles = await prisma.article.deleteMany({
      where: {
        fetchedAt: { lt: articleCutoff },
        isBookmarked: false, // Never delete bookmarked articles
      },
    })
    results.articles = { deleted: deletedArticles.count, duration: Date.now() - articleStart }
    log.info(`Deleted ${deletedArticles.count} old articles (older than ${CLEANUP_CONFIG.articleRetentionDays} days)`)

    // 2. Delete old fetch logs
    const fetchLogCutoff = new Date()
    fetchLogCutoff.setDate(fetchLogCutoff.getDate() - CLEANUP_CONFIG.fetchLogRetentionDays)

    const fetchLogStart = Date.now()
    const deletedFetchLogs = await prisma.fetchLog.deleteMany({
      where: { fetchedAt: { lt: fetchLogCutoff } },
    })
    results.fetchLogs = { deleted: deletedFetchLogs.count, duration: Date.now() - fetchLogStart }
    log.info(`Deleted ${deletedFetchLogs.count} old fetch logs (older than ${CLEANUP_CONFIG.fetchLogRetentionDays} days)`)

    // 3. Delete old financial fetch logs
    const financialLogCutoff = new Date()
    financialLogCutoff.setDate(financialLogCutoff.getDate() - CLEANUP_CONFIG.financialFetchLogRetentionDays)

    const financialLogStart = Date.now()
    const deletedFinancialLogs = await prisma.financialFetchLog.deleteMany({
      where: { fetchedAt: { lt: financialLogCutoff } },
    })
    results.financialFetchLogs = { deleted: deletedFinancialLogs.count, duration: Date.now() - financialLogStart }
    log.info(`Deleted ${deletedFinancialLogs.count} old financial fetch logs (older than ${CLEANUP_CONFIG.financialFetchLogRetentionDays} days)`)

    // 4. Delete old error logs
    const errorLogCutoff = new Date()
    errorLogCutoff.setDate(errorLogCutoff.getDate() - CLEANUP_CONFIG.errorLogRetentionDays)

    const errorLogStart = Date.now()
    const deletedErrorLogs = await prisma.errorLog.deleteMany({
      where: { createdAt: { lt: errorLogCutoff } },
    })
    results.errorLogs = { deleted: deletedErrorLogs.count, duration: Date.now() - errorLogStart }
    log.info(`Deleted ${deletedErrorLogs.count} old error logs (older than ${CLEANUP_CONFIG.errorLogRetentionDays} days)`)

    // 5. Clean up expired distributed locks
    const lockStart = Date.now()
    const deletedLocks = await prisma.distributedLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    results.expiredLocks = { deleted: deletedLocks.count, duration: Date.now() - lockStart }
    log.info(`Deleted ${deletedLocks.count} expired distributed locks`)

    // 6. Clean up old price history data (keep last 1 year for charts)
    const priceHistoryCutoff = new Date()
    priceHistoryCutoff.setFullYear(priceHistoryCutoff.getFullYear() - 1)

    const priceHistoryStart = Date.now()
    const deletedPriceHistory = await prisma.priceHistory.deleteMany({
      where: { timestamp: { lt: priceHistoryCutoff } },
    })
    results.priceHistory = { deleted: deletedPriceHistory.count, duration: Date.now() - priceHistoryStart }
    log.info(`Deleted ${deletedPriceHistory.count} old price history records (older than 1 year)`)

    // 7. Clean up old crypto candles (keep last 1 year)
    const cryptoCandleCutoff = new Date()
    cryptoCandleCutoff.setFullYear(cryptoCandleCutoff.getFullYear() - 1)

    const cryptoCandleStart = Date.now()
    const deletedCryptoCandles = await prisma.cryptoCandle.deleteMany({
      where: { timestamp: { lt: cryptoCandleCutoff } },
    })
    results.cryptoCandles = { deleted: deletedCryptoCandles.count, duration: Date.now() - cryptoCandleStart }
    log.info(`Deleted ${deletedCryptoCandles.count} old crypto candle records (older than 1 year)`)

    // 8. Clean up old global index quotes (keep last 1 year)
    const globalIndexCutoff = new Date()
    globalIndexCutoff.setFullYear(globalIndexCutoff.getFullYear() - 1)

    const globalIndexStart = Date.now()
    const deletedGlobalIndex = await prisma.globalIndexQuote.deleteMany({
      where: { timestamp: { lt: globalIndexCutoff } },
    })
    results.globalIndexQuotes = { deleted: deletedGlobalIndex.count, duration: Date.now() - globalIndexStart }
    log.info(`Deleted ${deletedGlobalIndex.count} old global index quotes (older than 1 year)`)

    const totalDuration = Date.now() - startTime
    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0)

    log.info(`Cleanup completed: ${totalDeleted} records deleted in ${totalDuration}ms`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        totalDeleted,
        details: results,
      },
    })
  } catch (error) {
    log.error('Cron cleanup failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger cleanup',
    timestamp: new Date().toISOString(),
    usage: 'POST /api/cron/cleanup',
    config: CLEANUP_CONFIG,
  })
}