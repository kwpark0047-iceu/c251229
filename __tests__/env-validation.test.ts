import { validateEnv, validateEnvOrThrow, getEnvStatus, ENV_CONFIG } from '@/lib/env-validation'
import { withMockEnv } from '@/lib/test-utils'

describe('env-validation', () => {
  describe('ENV_CONFIG', () => {
    it('has required configs for critical variables', () => {
      const dbConfig = ENV_CONFIG.find(c => c.name === 'DATABASE_URL')
      expect(dbConfig).toBeDefined()
      expect(dbConfig?.required).toBe(true)
      expect(dbConfig?.environments).toContain('production')

      const jwtConfig = ENV_CONFIG.find(c => c.name === 'JWT_SECRET')
      expect(jwtConfig).toBeDefined()
      expect(jwtConfig?.required).toBe(true)
    })

    it('has optional configs for feature-specific variables', () => {
      const geminiConfig = ENV_CONFIG.find(c => c.name === 'GEMINI_API_KEY')
      expect(geminiConfig).toBeDefined()
      expect(geminiConfig?.required).toBe(false)
    })

    it('includes cross-validation rules for dependent variables', () => {
      const llmProviderConfig = ENV_CONFIG.find(c => c.name === 'LLM_PROVIDER')
      expect(llmProviderConfig).toBeDefined()
      expect(llmProviderConfig?.validate).toBeDefined()
    })
  })

  describe('validateEnv', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('returns valid=true when all required vars are set', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        LLM_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'AIzaTestKey123456789',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('returns valid=false when required vars are missing', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: '',
        JWT_SECRET: '',
        CRON_SECRET: '',
        NEXT_PUBLIC_BASE_URL: '',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.missingRequired).toContain('DATABASE_URL')
        expect(result.missingRequired).toContain('JWT_SECRET')
        expect(result.missingRequired).toContain('CRON_SECRET')
        expect(result.missingRequired).toContain('NEXT_PUBLIC_BASE_URL')
      })
    })

    it('validates JWT_SECRET minimum length', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'short', // Too short
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('JWT_SECRET'))).toBe(true)
      })
    })

    it('validates NEXT_PUBLIC_BASE_URL is HTTPS', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'http://example.com', // Not HTTPS
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('NEXT_PUBLIC_BASE_URL'))).toBe(true)
      })
    })

    it('validates LLM_PROVIDER values', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        LLM_PROVIDER: 'invalid_provider',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('LLM_PROVIDER'))).toBe(true)
      })
    })

    it('requires GEMINI_API_KEY when LLM_PROVIDER=gemini', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        LLM_PROVIDER: 'gemini',
        // Missing GEMINI_API_KEY
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('GEMINI_API_KEY'))).toBe(true)
      })
    })

    it('requires OPENAI_API_KEY when LLM_PROVIDER=openai', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        LLM_PROVIDER: 'openai',
        // Missing OPENAI_API_KEY
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('OPENAI_API_KEY'))).toBe(true)
      })
    })

    it('requires Twilio vars when SMS_PROVIDER=twilio', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        SMS_PROVIDER: 'twilio',
        // Missing Twilio vars
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.missingRequired).toContain('TWILIO_ACCOUNT_SID')
        expect(result.missingRequired).toContain('TWILIO_AUTH_TOKEN')
        expect(result.missingRequired).toContain('TWILIO_PHONE_NUMBER')
      })
    })

    it('warns about VAPID key mismatch', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        VAPID_PUBLIC_KEY: 'key1',
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'key2', // Mismatch
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(true) // Warnings don't make it invalid
        expect(result.warnings.some(w => w.includes('VAPID'))).toBe(true)
      })
    })

    it('does not require optional vars in development', () => {
      withMockEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'a'.repeat(32),
        // CRON_SECRET not required in development
        // NEXT_PUBLIC_BASE_URL not required in development
      }, () => {
        const result = validateEnv()
        // In development, only DATABASE_URL and JWT_SECRET are required
        expect(result.valid).toBe(true)
      })
    })

    it('validates REDIS_URL format', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        REDIS_URL: 'invalid-url',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('REDIS_URL'))).toBe(true)
      })
    })

    it('validates SMTP_PORT is valid port number', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '99999', // Invalid port
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('SMTP_PORT'))).toBe(true)
      })
    })

    it('validates DISABLE_SCHEDULERS values', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
        DISABLE_SCHEDULERS: 'invalid',
      }, () => {
        const result = validateEnv()
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('DISABLE_SCHEDULERS'))).toBe(true)
      })
    })
  })

  describe('getEnvStatus', () => {
    it('returns status for all env vars', () => {
      const originalEnv = { ...process.env }
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
      }

      const status = getEnvStatus()
      expect(status.DATABASE_URL).toEqual({ set: true, required: true, value: 'postgresql://user:pass@localhost:5432/db' })
      expect(status.JWT_SECRET).toEqual({ set: true, required: true, value: '[REDACTED]' })
      expect(status.CRON_SECRET).toEqual({ set: true, required: true, value: '[REDACTED]' })
      expect(status.NEXT_PUBLIC_BASE_URL).toEqual({ set: true, required: true, value: 'https://example.vercel.app' })
      expect(status.GEMINI_API_KEY).toEqual({ set: false, required: false })

      process.env = originalEnv
    })
  })

  describe('validateEnvOrThrow', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('throws when validation fails', () => {
      withMockEnv({
        NODE_ENV: 'production',
        // Missing required vars
      }, () => {
        expect(() => validateEnvOrThrow()).toThrow('Environment validation failed')
      })
    })

    it('does not throw when validation passes', () => {
      withMockEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        CRON_SECRET: 'b'.repeat(32),
        NEXT_PUBLIC_BASE_URL: 'https://example.vercel.app',
      }, () => {
        expect(() => validateEnvOrThrow()).not.toThrow()
      })
    })
  })
})