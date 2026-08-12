import { createLogger } from '@/lib/logger'

const log = createLogger('EnvValidation')

/**
 * Environment variable validation configuration
 * Categorized by criticality and environment
 */

export interface EnvVarConfig {
  name: string
  required: boolean
  environments: ('development' | 'production' | 'test')[]
  description: string
  validate?: (value: string) => boolean
  validateMessage?: string
}

export const ENV_CONFIG: EnvVarConfig[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    environments: ['development', 'production', 'test'],
    description: 'PostgreSQL connection string (production) or SQLite file path (development)',
    validate: (v) => v.startsWith('postgresql://') || v.startsWith('file:'),
    validateMessage: 'Must be a valid PostgreSQL URL (postgresql://...) or SQLite file path (file:...)',
  },

  // Authentication & Security
  {
    name: 'JWT_SECRET',
    required: true,
    environments: ['development', 'production', 'test'],
    description: 'Secret key for JWT token signing (min 32 characters)',
    validate: (v) => v.length >= 32,
    validateMessage: 'Must be at least 32 characters long',
  },
  {
    name: 'CRON_SECRET',
    required: true,
    environments: ['production'],
    description: 'Bearer token for cron endpoint authentication',
    validate: (v) => v.length >= 32,
    validateMessage: 'Must be at least 32 characters long',
  },

  // API Keys - AI/LLM
  {
    name: 'GEMINI_API_KEY',
    required: false, // Optional if using other LLM provider
    environments: ['development', 'production'],
    description: 'Google Gemini API key for AI summaries',
    validate: (v) => v.startsWith('AIza') || v.startsWith('sk-'),
    validateMessage: 'Must be a valid Gemini API key (starts with AIza) or OpenAI key (starts with sk-)',
  },
  {
    name: 'OPENAI_API_KEY',
    required: false, // Optional if using other LLM provider
    environments: ['development', 'production'],
    description: 'OpenAI API key for AI summaries (fallback)',
    validate: (v) => v.startsWith('sk-'),
    validateMessage: 'Must be a valid OpenAI API key (starts with sk-)',
  },
  {
    name: 'LLM_PROVIDER',
    required: false,
    environments: ['development', 'production'],
    description: 'Which LLM provider to use: gemini, openai, or mock',
    validate: (v) => ['gemini', 'openai', 'mock'].includes(v),
    validateMessage: 'Must be one of: gemini, openai, mock',
  },

  // News Sources
  {
    name: 'NAVER_CLIENT_ID',
    required: false, // Only needed for Naver news search
    environments: ['development', 'production'],
    description: 'Naver Open API Client ID for news search',
  },
  {
    name: 'NAVER_CLIENT_SECRET',
    required: false,
    environments: ['development', 'production'],
    description: 'Naver Open API Client Secret for news search',
  },

  // Email/SMS
  {
    name: 'SMTP_HOST',
    required: false, // Only needed for newsletter emails
    environments: ['production'],
    description: 'SMTP server host for sending emails',
  },
  {
    name: 'SMTP_PORT',
    required: false,
    environments: ['production'],
    description: 'SMTP server port (usually 587 or 465)',
    validate: (v) => {
      const port = parseInt(v, 10)
      return !isNaN(port) && port > 0 && port <= 65535
    },
    validateMessage: 'Must be a valid port number (1-65535)',
  },
  {
    name: 'SMTP_USER',
    required: false,
    environments: ['production'],
    description: 'SMTP username for authentication',
  },
  {
    name: 'SMTP_PASS',
    required: false,
    environments: ['production'],
    description: 'SMTP password for authentication',
  },
  {
    name: 'SMS_PROVIDER',
    required: false,
    environments: ['development', 'production'],
    description: 'SMS provider: mock, twilio, or solapi',
    validate: (v) => ['mock', 'twilio', 'solapi'].includes(v),
    validateMessage: 'Must be one of: mock, twilio, solapi',
  },
  {
    name: 'TWILIO_ACCOUNT_SID',
    required: false,
    environments: ['production'],
    description: 'Twilio Account SID (required if SMS_PROVIDER=twilio)',
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    required: false,
    environments: ['production'],
    description: 'Twilio Auth Token (required if SMS_PROVIDER=twilio)',
  },
  {
    name: 'TWILIO_PHONE_NUMBER',
    required: false,
    environments: ['production'],
    description: 'Twilio phone number for sending SMS (required if SMS_PROVIDER=twilio)',
  },

  // Push Notifications
  {
    name: 'VAPID_PUBLIC_KEY',
    required: false,
    environments: ['production'],
    description: 'VAPID public key for Web Push notifications',
  },
  {
    name: 'VAPID_PRIVATE_KEY',
    required: false,
    environments: ['production'],
    description: 'VAPID private key for Web Push notifications',
  },
  {
    name: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    required: false,
    environments: ['production'],
    description: 'VAPID public key exposed to client (must match VAPID_PUBLIC_KEY)',
  },

  // Redis/Upstash
  {
    name: 'REDIS_URL',
    required: false, // Falls back to in-memory cache
    environments: ['production'],
    description: 'Redis connection URL (Upstash) for caching and rate limiting',
    validate: (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
    validateMessage: 'Must be a valid Redis URL (redis:// or rediss://)',
  },

  // Public URLs
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    required: true,
    environments: ['production'],
    description: 'Public base URL of the deployed application (e.g., https://example.vercel.app)',
    validate: (v) => {
      try {
        const url = new URL(v)
        return url.protocol === 'https:'
      } catch {
        return false
      }
    },
    validateMessage: 'Must be a valid HTTPS URL (e.g., https://your-app.vercel.app)',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    environments: ['development', 'production'],
    description: 'Alternative public URL (deprecated, use NEXT_PUBLIC_BASE_URL)',
  },

  // Korea Investment API
  {
    name: 'KOREA_INVEST_APP_KEY',
    required: false, // Only needed for real stock data
    environments: ['production'],
    description: 'Korea Investment Open API App Key',
  },
  {
    name: 'KOREA_INVEST_APP_SECRET',
    required: false,
    environments: ['production'],
    description: 'Korea Investment Open API App Secret',
  },
  {
    name: 'KOREA_INVEST_IS_MOCK',
    required: false,
    environments: ['development', 'production'],
    description: 'Use mock mode for Korea Investment API (true/false)',
    validate: (v) => ['true', 'false'].includes(v),
    validateMessage: 'Must be "true" or "false"',
  },

  // Feature Flags
  {
    name: 'DISABLE_SCHEDULERS',
    required: false,
    environments: ['development', 'production', 'test'],
    description: 'Disable all background schedulers (set to "1" to disable)',
    validate: (v) => ['0', '1', 'true', 'false'].includes(v),
    validateMessage: 'Must be "0", "1", "true", or "false"',
  },
  {
    name: 'DISABLE_PLAYWRIGHT',
    required: false,
    environments: ['development', 'production', 'test'],
    description: 'Disable Playwright crawler entirely (set to "1" to disable)',
    validate: (v) => ['0', '1', 'true', 'false'].includes(v),
    validateMessage: 'Must be "0", "1", "true", or "false"',
  },

  // Monitoring
  {
    name: 'SENTRY_DSN',
    required: false,
    environments: ['production'],
    description: 'Sentry DSN for error tracking',
    validate: (v) => v.startsWith('https://') && v.includes('@'),
    validateMessage: 'Must be a valid Sentry DSN',
  },
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false,
    environments: ['production'],
    description: 'Sentry DSN exposed to client (must match SENTRY_DSN)',
  },

  // Social Login
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    environments: ['production'],
    description: 'Google OAuth Client ID',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    environments: ['production'],
    description: 'Google OAuth Client Secret',
  },
  {
    name: 'KAKAO_CLIENT_ID',
    required: false,
    environments: ['production'],
    description: 'Kakao OAuth Client ID',
  },
  {
    name: 'KAKAO_CLIENT_SECRET',
    required: false,
    environments: ['production'],
    description: 'Kakao OAuth Client Secret',
  },
]

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  missingRequired: string[]
  missingOptional: string[]
}

/**
 * Validate environment variables
 */
export function validateEnv(): ValidationResult {
  const currentEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  const errors: string[] = []
  const warnings: string[] = []
  const missingRequired: string[] = []
  const missingOptional: string[] = []

  for (const config of ENV_CONFIG) {
    // Skip if not applicable to current environment
    if (!config.environments.includes(currentEnv)) {
      continue
    }

    const value = process.env[config.name]

    if (!value || value.trim() === '') {
      if (config.required) {
        errors.push(`[REQUIRED] ${config.name}: ${config.description}`)
        missingRequired.push(config.name)
      } else {
        warnings.push(`[OPTIONAL] ${config.name}: ${config.description} (not set)`)
        missingOptional.push(config.name)
      }
      continue
    }

    // Run custom validation if provided
    if (config.validate && !config.validate(value)) {
      const msg = config.validateMessage || `Invalid value for ${config.name}`
      errors.push(`[${config.required ? 'REQUIRED' : 'OPTIONAL'}] ${config.name}: ${msg}`)
      if (config.required) {
        missingRequired.push(config.name)
      } else {
        missingOptional.push(config.name)
      }
    }
  }

  // Cross-validation checks
  if (process.env.LLM_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    errors.push('[REQUIRED] GEMINI_API_KEY is required when LLM_PROVIDER=gemini')
    missingRequired.push('GEMINI_API_KEY')
  }
  if (process.env.LLM_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    errors.push('[REQUIRED] OPENAI_API_KEY is required when LLM_PROVIDER=openai')
    missingRequired.push('OPENAI_API_KEY')
  }
  if (process.env.SMS_PROVIDER === 'twilio') {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      errors.push('[REQUIRED] TWILIO_ACCOUNT_SID is required when SMS_PROVIDER=twilio')
      missingRequired.push('TWILIO_ACCOUNT_SID')
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      errors.push('[REQUIRED] TWILIO_AUTH_TOKEN is required when SMS_PROVIDER=twilio')
      missingRequired.push('TWILIO_AUTH_TOKEN')
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      errors.push('[REQUIRED] TWILIO_PHONE_NUMBER is required when SMS_PROVIDER=twilio')
      missingRequired.push('TWILIO_PHONE_NUMBER')
    }
  }
  if (process.env.VAPID_PUBLIC_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    if (process.env.VAPID_PUBLIC_KEY !== process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      warnings.push('VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY should match')
    }
  }
  if (process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (process.env.SENTRY_DSN !== process.env.NEXT_PUBLIC_SENTRY_DSN) {
      warnings.push('SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN should match')
    }
  }

  const valid = errors.length === 0

  if (valid) {
    log.info('Environment validation passed', {
      environment: currentEnv,
      warningsCount: warnings.length,
      optionalMissing: missingOptional.length,
    })
  } else {
    log.error('Environment validation failed', {
      environment: currentEnv,
      errors,
      warnings,
    })
  }

  return {
    valid,
    errors,
    warnings,
    missingRequired,
    missingOptional,
  }
}

/**
 * Validate and throw if invalid (for use at app startup)
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv()
  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...result.errors.map((e) => `  - ${e}`),
      result.warnings.length > 0
        ? ['Warnings:', ...result.warnings.map((w) => `  - ${w}`)].join('\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    throw new Error(errorMessage)
  }
}

/**
 * Get list of all environment variables with their status (for debugging)
 */
export function getEnvStatus(): Record<string, { set: boolean; required: boolean; value?: string }> {
  const currentEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
  const status: Record<string, { set: boolean; required: boolean; value?: string }> = {}

  for (const config of ENV_CONFIG) {
    if (!config.environments.includes(currentEnv)) {
      continue
    }
    const value = process.env[config.name]
    status[config.name] = {
      set: !!value && value.trim() !== '',
      required: config.required,
      value: value ? (config.name.includes('SECRET') || config.name.includes('KEY') || config.name.includes('PASS') ? '[REDACTED]' : value) : undefined,
    }
  }

  return status
}