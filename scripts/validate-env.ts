#!/usr/bin/env node
/**
 * Startup validation script
 * Runs environment validation before starting the application
 * Used in production startup (vercel-build, Docker, etc.)
 */

import { validateEnvOrThrow, getEnvStatus } from './src/lib/env-validation'

console.log('🔍 Running environment validation...')
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

try {
  validateEnvOrThrow()
  
  const status = getEnvStatus()
  const setCount = Object.values(status).filter(s => s.set).length
  const requiredCount = Object.values(status).filter(s => s.required).length
  const requiredSet = Object.values(status).filter(s => s.required && s.set).length
  
  console.log('✅ Environment validation passed!')
  console.log(`📊 Variables: ${setCount}/${Object.keys(status).length} set, ${requiredSet}/${requiredCount} required set`)
  
  // Log missing optional variables in development
  if (process.env.NODE_ENV !== 'production') {
    const missingOptional = Object.entries(status)
      .filter(([_, s]) => !s.required && !s.set)
      .map(([name]) => name)
    if (missingOptional.length > 0) {
      console.log('⚠️  Optional variables not set:', missingOptional.join(', '))
    }
  }
  
  process.exit(0)
} catch (error) {
  console.error('❌ Environment validation failed:')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}