-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RSS', 'AI_IT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL DEFAULT 'RSS',
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "fetch_interval" INTEGER NOT NULL DEFAULT 3,
    "fetch_type" TEXT NOT NULL DEFAULT 'rss',
    "crawler_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL DEFAULT 'RSS',
    "category_id" TEXT,
    "guid" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "translated_content" TEXT,
    "author" TEXT,
    "thumbnail" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ko',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT NOT NULL DEFAULT '',
    "is_breaking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fetch_logs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "duration" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verification_code" TEXT,
    "verification_expires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hidden_sources" TEXT NOT NULL DEFAULT '',
    "pinned_sources" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'all',
    "interests" TEXT NOT NULL DEFAULT '',
    "alert_keywords" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "position" TEXT NOT NULL DEFAULT 'top',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ad_type" TEXT NOT NULL DEFAULT 'image',
    "content" TEXT NOT NULL,
    "link_url" TEXT,
    "position" TEXT NOT NULL DEFAULT 'sidebar',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "parent_id" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_tag_relations" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_tag_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_summaries" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "translated_title" TEXT,
    "summary_3line" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_companies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "model_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "sector" TEXT,
    "industry" TEXT,
    "listing_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_prices" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "price" DECIMAL(20,2) NOT NULL,
    "change" DECIMAL(20,2) NOT NULL,
    "change_rate" DECIMAL(10,4) NOT NULL,
    "open_price" DECIMAL(20,2) NOT NULL,
    "high_price" DECIMAL(20,2) NOT NULL,
    "low_price" DECIMAL(20,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "trading_value" DECIMAL(30,2) NOT NULL,
    "market_cap" DECIMAL(30,2),
    "listed_shares" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_daily_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "market" TEXT NOT NULL,
    "total_stocks" INTEGER NOT NULL,
    "advancing" INTEGER NOT NULL,
    "declining" INTEGER NOT NULL,
    "unchanged" INTEGER NOT NULL,
    "upper_limit" INTEGER NOT NULL,
    "lower_limit" INTEGER NOT NULL,
    "total_volume" BIGINT NOT NULL,
    "total_value" DECIMAL(30,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_watchlists" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stock_code" TEXT NOT NULL,
    "stock_name" TEXT NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "stock_watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cryptocurrencies" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_kr" TEXT,
    "market" TEXT NOT NULL DEFAULT 'UPBIT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cryptocurrencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_tickers" (
    "id" TEXT NOT NULL,
    "crypto_id" TEXT NOT NULL,
    "trade_price" DECIMAL(30,8) NOT NULL,
    "signed_change_price" DECIMAL(30,8) NOT NULL,
    "signed_change_rate" DECIMAL(10,6) NOT NULL,
    "ask_price" DECIMAL(30,8) NOT NULL,
    "bid_price" DECIMAL(30,8) NOT NULL,
    "acc_trade_price_24h" DECIMAL(30,2) NOT NULL,
    "acc_trade_volume_24h" DECIMAL(30,8) NOT NULL,
    "high_price_24h" DECIMAL(30,8) NOT NULL,
    "low_price_24h" DECIMAL(30,8) NOT NULL,
    "prev_closing_price" DECIMAL(30,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_tickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_candles" (
    "id" TEXT NOT NULL,
    "crypto_id" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "open_price" DECIMAL(30,8) NOT NULL,
    "high_price" DECIMAL(30,8) NOT NULL,
    "low_price" DECIMAL(30,8) NOT NULL,
    "trade_price" DECIMAL(30,8) NOT NULL,
    "candle_acc_trade_volume" DECIMAL(30,8) NOT NULL,
    "candle_acc_trade_price" DECIMAL(30,2) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_daily_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_market_cap" DECIMAL(30,2) NOT NULL,
    "total_volume_24h" DECIMAL(30,2) NOT NULL,
    "btc_dominance" DECIMAL(10,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crypto_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL DEFAULT 'KRW',
    "rate" DECIMAL(20,6) NOT NULL,
    "change" DECIMAL(20,6) NOT NULL,
    "change_rate" DECIMAL(10,6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BOK',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_daily_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "usd_rate" DECIMAL(20,6) NOT NULL,
    "usd_change" DECIMAL(20,6) NOT NULL,
    "usd_change_rate" DECIMAL(10,6) NOT NULL,
    "jpy_rate" DECIMAL(20,6) NOT NULL,
    "jpy_change" DECIMAL(20,6) NOT NULL,
    "jpy_change_rate" DECIMAL(10,6) NOT NULL,
    "eur_rate" DECIMAL(20,6) NOT NULL,
    "eur_change" DECIMAL(20,6) NOT NULL,
    "eur_change_rate" DECIMAL(10,6) NOT NULL,
    "cny_rate" DECIMAL(20,6) NOT NULL,
    "cny_change" DECIMAL(20,6) NOT NULL,
    "cny_change_rate" DECIMAL(10,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_indices" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_kr" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_index_quotes" (
    "id" TEXT NOT NULL,
    "index_id" TEXT NOT NULL,
    "price" DECIMAL(20,4) NOT NULL,
    "change" DECIMAL(20,4) NOT NULL,
    "change_rate" DECIMAL(10,6) NOT NULL,
    "open_price" DECIMAL(20,4),
    "high_price" DECIMAL(20,4),
    "low_price" DECIMAL(20,4),
    "previous_close" DECIMAL(20,4),
    "volume" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_index_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_histories" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "open_price" DECIMAL(30,8) NOT NULL,
    "high_price" DECIMAL(30,8) NOT NULL,
    "low_price" DECIMAL(30,8) NOT NULL,
    "close_price" DECIMAL(30,8) NOT NULL,
    "volume" DECIMAL(30,8),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_fetch_logs" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "duration" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributed_locks" (
    "id" TEXT NOT NULL,
    "lock_name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributed_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "interests" TEXT NOT NULL DEFAULT '',
    "alertKeywords" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys_p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'error',
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "sentry_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_en_key" ON "sources"("name_en");

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE INDEX "sources_source_type_is_active_idx" ON "sources"("source_type", "is_active");

-- CreateIndex
CREATE INDEX "sources_category_is_active_idx" ON "sources"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");

-- CreateIndex
CREATE INDEX "articles_source_type_published_at_idx" ON "articles"("source_type", "published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_source_id_published_at_idx" ON "articles"("source_id", "published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_category_published_at_idx" ON "articles"("category", "published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_language_published_at_idx" ON "articles"("language", "published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_published_at_idx" ON "articles"("published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_view_count_published_at_idx" ON "articles"("view_count" DESC, "published_at" DESC);

-- CreateIndex
CREATE INDEX "fetch_logs_source_id_fetched_at_idx" ON "fetch_logs"("source_id", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "fetch_logs_status_fetched_at_idx" ON "fetch_logs"("status", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "fetch_logs_fetched_at_idx" ON "fetch_logs"("fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "banners_position_is_active_idx" ON "banners"("position", "is_active");

-- CreateIndex
CREATE INDEX "banners_sort_order_idx" ON "banners"("sort_order");

-- CreateIndex
CREATE INDEX "advertisements_position_is_active_idx" ON "advertisements"("position", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "news_categories_name_en_key" ON "news_categories"("name_en");

-- CreateIndex
CREATE INDEX "news_categories_category_type_is_active_idx" ON "news_categories"("category", "type", "is_active");

-- CreateIndex
CREATE INDEX "news_categories_parent_id_idx" ON "news_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_tags_name_key" ON "news_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "news_tags_name_en_key" ON "news_tags"("name_en");

-- CreateIndex
CREATE INDEX "news_tags_type_is_active_idx" ON "news_tags"("type", "is_active");

-- CreateIndex
CREATE INDEX "news_tag_relations_article_id_idx" ON "news_tag_relations"("article_id");

-- CreateIndex
CREATE INDEX "news_tag_relations_tag_id_idx" ON "news_tag_relations"("tag_id");

-- CreateIndex
CREATE INDEX "news_tag_relations_tag_id_article_id_idx" ON "news_tag_relations"("tag_id", "article_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_tag_relations_article_id_tag_id_key" ON "news_tag_relations"("article_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "news_summaries_article_id_key" ON "news_summaries"("article_id");

-- CreateIndex
CREATE INDEX "news_summaries_ai_generated_idx" ON "news_summaries"("ai_generated");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_code_key" ON "stocks"("code");

-- CreateIndex
CREATE INDEX "stocks_market_is_active_idx" ON "stocks"("market", "is_active");

-- CreateIndex
CREATE INDEX "stocks_code_idx" ON "stocks"("code");

-- CreateIndex
CREATE INDEX "stock_prices_stock_id_timestamp_idx" ON "stock_prices"("stock_id", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "stock_daily_stats_date_key" ON "stock_daily_stats"("date");

-- CreateIndex
CREATE INDEX "stock_daily_stats_date_market_idx" ON "stock_daily_stats"("date", "market");

-- CreateIndex
CREATE INDEX "stock_watchlists_stock_code_idx" ON "stock_watchlists"("stock_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_watchlists_stock_code_user_id_key" ON "stock_watchlists"("stock_code", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cryptocurrencies_symbol_key" ON "cryptocurrencies"("symbol");

-- CreateIndex
CREATE INDEX "cryptocurrencies_symbol_idx" ON "cryptocurrencies"("symbol");

-- CreateIndex
CREATE INDEX "cryptocurrencies_is_active_idx" ON "cryptocurrencies"("is_active");

-- CreateIndex
CREATE INDEX "crypto_tickers_crypto_id_timestamp_idx" ON "crypto_tickers"("crypto_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "crypto_candles_crypto_id_unit_timestamp_idx" ON "crypto_candles"("crypto_id", "unit", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "crypto_candles_crypto_id_unit_timestamp_key" ON "crypto_candles"("crypto_id", "unit", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "crypto_daily_stats_date_key" ON "crypto_daily_stats"("date");

-- CreateIndex
CREATE INDEX "crypto_daily_stats_date_idx" ON "crypto_daily_stats"("date" DESC);

-- CreateIndex
CREATE INDEX "exchange_rates_base_currency_quote_currency_timestamp_idx" ON "exchange_rates"("base_currency", "quote_currency", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_quote_currency_timestamp_key" ON "exchange_rates"("base_currency", "quote_currency", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_daily_stats_date_key" ON "exchange_rate_daily_stats"("date");

-- CreateIndex
CREATE INDEX "exchange_rate_daily_stats_date_idx" ON "exchange_rate_daily_stats"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "global_indices_symbol_key" ON "global_indices"("symbol");

-- CreateIndex
CREATE INDEX "global_indices_symbol_idx" ON "global_indices"("symbol");

-- CreateIndex
CREATE INDEX "global_indices_is_active_idx" ON "global_indices"("is_active");

-- CreateIndex
CREATE INDEX "global_index_quotes_index_id_timestamp_idx" ON "global_index_quotes"("index_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "price_histories_symbol_type_timeframe_timestamp_idx" ON "price_histories"("symbol", "type", "timeframe", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "price_histories_symbol_type_timeframe_timestamp_key" ON "price_histories"("symbol", "type", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "financial_fetch_logs_service_fetched_at_idx" ON "financial_fetch_logs"("service", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "financial_fetch_logs_status_fetched_at_idx" ON "financial_fetch_logs"("status", "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "distributed_locks_lock_name_key" ON "distributed_locks"("lock_name");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_user_id_key" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_id_key" ON "social_accounts"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "error_logs_level_created_at_idx" ON "error_logs"("level", "created_at");

-- CreateIndex
CREATE INDEX "error_logs_source_created_at_idx" ON "error_logs"("source", "created_at");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fetch_logs" ADD CONSTRAINT "fetch_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_categories" ADD CONSTRAINT "news_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tag_relations" ADD CONSTRAINT "news_tag_relations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tag_relations" ADD CONSTRAINT "news_tag_relations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "news_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_summaries" ADD CONSTRAINT "news_summaries_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_prices" ADD CONSTRAINT "stock_prices_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_tickers" ADD CONSTRAINT "crypto_tickers_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_candles" ADD CONSTRAINT "crypto_candles_crypto_id_fkey" FOREIGN KEY ("crypto_id") REFERENCES "cryptocurrencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_index_quotes" ADD CONSTRAINT "global_index_quotes_index_id_fkey" FOREIGN KEY ("index_id") REFERENCES "global_indices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

