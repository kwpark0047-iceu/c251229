import { describe, test, expect, vi } from 'vitest'
import { ImageOptimizationService } from './image-optimization-service'

describe('ImageOptimizationService', () => {
  describe('optimizeImageUrl', () => {
    test('applies width parameter', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800 })
      expect(result).toContain('w=800')
    })

    test('applies gravity parameter', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800, gravity: 'center' })
      expect(result).toContain('g=center')
    })

    test('applies fit parameter', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800, fit: 'cover' })
      expect(result).toContain('fit=cover')
    })

    test('applies format parameter (param name is f)', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800, format: 'webp' })
      expect(result).toContain('f=webp')
    })

    test('appends params with & when original has query string', () => {
      const url = 'https://example.com/image.jpg?foo=bar'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800 })
      expect(result).toContain('foo=bar')
      expect(result).toContain('&')
      expect(result).toContain('w=800')
    })

    test('handles URL without existing query string', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().optimizeImageUrl(url, { width: 800 })
      expect(result).toContain('w=800')
      expect(result).not.toContain('foo=bar')
    })

    test('generates srcset with default breakpoints', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().generateSrcSet(url)
      expect(result).toContain('320w')
      expect(result).toContain('640w')
      expect(result).toContain('768w')
      expect(result).toContain('1024w')
      expect(result).toContain('1280w')
      expect(result).toContain('1536w')
    })

    test('generates srcset with custom breakpoints', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().generateSrcSet(url, [400, 800])
      expect(result).toContain('400w')
      expect(result).toContain('800w')
      expect(result).not.toContain('320w')
      expect(result).not.toContain('640w')
    })

    test('joins entries with , separator', () => {
      const url = 'https://example.com/image.jpg'
      const result = new ImageOptimizationService().generateSrcSet(url)
      const count = (result.match(/, /g) || []).length
      expect(count).toBe(5)
    })
  })

  describe('convertImageFormat', () => {
    test('converts to webp with quality 80', async () => {
      const service = new ImageOptimizationService()
      const result = await service.convertImageFormat('https://example.com/image.jpg', 'webp')
      expect(typeof result).toBe('string')
      expect(result).toContain('f=webp')
      expect(result).toContain('q=80')
    })

    test('converts to avif with quality 80', async () => {
      const service = new ImageOptimizationService()
      const result = await service.convertImageFormat('https://example.com/image.jpg', 'avif')
      expect(typeof result).toBe('string')
      expect(result).toContain('f=avif')
      expect(result).toContain('q=80')
    })

    test('keeps jpeg quality as-is when already jpeg', async () => {
      const service = new ImageOptimizationService()
      const result = await service.convertImageFormat('https://example.com/image.jpg', 'jpeg')
      expect(typeof result).toBe('string')
      expect(result).toContain('f=jpeg')
      expect(result).toContain('q=85')
    })

    test('keeps png quality as-is when already png', async () => {
      const service = new ImageOptimizationService()
      const result = await service.convertImageFormat('https://example.com/image.jpg', 'png')
      expect(typeof result).toBe('string')
      expect(result).toContain('f=png')
      expect(result).toContain('q=85')
    })
  })

  describe('uploadAndOptimizeImage', () => {
    test('successful upload returns { url, metadata }', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const service = new ImageOptimizationService() as any

      service.supabase = {
        storage: {
          from: () => ({
            upload: () => ({ data: { path: 'test-path' }, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.example.com/test.jpg' } }),
          }),
        },
      }
      service.validateImageFile = vi.fn().mockResolvedValue(undefined)
      service.extractImageMetadata = vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg', size: 102400, aspectRatio: 1.33, hasAlpha: false, colorSpace: 'srgb' })
      service.generateFileName = vi.fn().mockReturnValue('test-path')

      const result = await service.uploadAndOptimizeImage(file)
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata.width).toBe(800)
    })

    test('throws when upload returns error', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const service = new ImageOptimizationService() as any

      service.supabase = {
        storage: {
          from: () => ({
            upload: () => ({ data: null, error: new Error('Upload failed') }),
            getPublicUrl: () => ({ data: { publicUrl: 'u' } }),
          }),
        },
      }
      service.validateImageFile = vi.fn().mockResolvedValue(undefined)
      service.extractImageMetadata = vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg', size: 102400, aspectRatio: 1.33, hasAlpha: false, colorSpace: 'srgb' })
      service.generateFileName = vi.fn().mockReturnValue('test-path')

      await expect(service.uploadAndOptimizeImage(file)).rejects.toThrow('Upload failed')
    })
  })

  describe('optimizeBatchImages', () => {
    test('processes URLs in chunks of 5 with options', async () => {
      const service = new ImageOptimizationService() as any

      service.supabase = {
        storage: {
          from: () => ({
            upload: () => ({ data: { path: 'p' }, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: 'u' } }),
          }),
        },
      }
      service.validateImageFile = vi.fn().mockResolvedValue(undefined)
      service.extractImageMetadata = vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg', size: 102400, aspectRatio: 1.33, hasAlpha: false, colorSpace: 'srgb' })
      service.generateFileName = vi.fn().mockReturnValue('p')

      const urls = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']
      const result = await service.optimizeBatchImages(urls, { width: 800 })

      expect(result).toHaveLength(7)
      expect(result[0]).toContain('w=800')
      expect(result[4]).toContain('w=800')
      expect(result[5]).toContain('w=800')
      expect(result[6]).toContain('w=800')
    })

    test('falls back to original URL when optimization fails', async () => {
      const service = new ImageOptimizationService() as any

      service.supabase = {
        storage: {
          from: () => ({
            upload: () => ({ data: { path: 'p' }, error: null }),
            getPublicUrl: () => {
              throw new Error('CDN failed')
            },
          }),
        },
      }
      service.validateImageFile = vi.fn().mockResolvedValue(undefined)
      service.extractImageMetadata = vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg', size: 102400, aspectRatio: 1.33, hasAlpha: false, colorSpace: 'srgb' })
      service.generateFileName = vi.fn().mockReturnValue('p')

      const urls = ['u1', 'u2']
      const result = await service.optimizeBatchImages(urls, { width: 800 })

      expect(result).toEqual(['u1?w=800', 'u2?w=800'])
    })
  })
})