/**
 * 이미지 최적화 서비스
 * WebP 변환, 리사이징, 압축, CDN 연동
 */

import { createClient } from '@/lib/supabase/client';

// 이미지 최적화 옵션
interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  crop?: string;
  gravity?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  sharpen?: boolean;
  blur?: number;
}

// 이미지 메타데이터
interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number; // bytes
  aspectRatio: number;
  hasAlpha: boolean;
  colorSpace: string;
}

// 이미지 캐시
class ImageCache {
  private cache = new Map<string, {
    url: string;
    metadata: ImageMetadata;
    timestamp: number;
  }>();
  private maxCacheSize = 1000;
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24시간

  set(key: string, url: string, metadata: ImageMetadata): void {
    // LRU 정책
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      url,
      metadata,
      timestamp: Date.now(),
    });
  }

  get(key: string): { url: string; metadata: ImageMetadata } | null {
    const item = this.cache.get(key);
    
    if (!item) return null;

    // 만료 체크
    if (Date.now() - item.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // 실제 구현에서는 히트/미스 카운트 필요
    };
  }
}

/**
 * 이미지 최적화 서비스
 */
export class ImageOptimizationService {
  private supabase = createClient();
  private cache = new ImageCache();
  private cdnBaseUrl = 'https://cdn.wemarket.kr'; // CDN 기본 URL

  /**
   * 이미지 URL 최적화
   */
  optimizeImageUrl(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): string {
    // 캐시 키 생성
    const cacheKey = this.generateCacheKey(originalUrl, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached.url;
    }

    let optimizedUrl = originalUrl;

    // CDN URL로 변환
    if (originalUrl.includes('supabase.co/storage')) {
      optimizedUrl = this.convertToCdnUrl(originalUrl);
    }

    // 최적화 파라미터 추가
    const params = new URLSearchParams();

    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.fit) params.set('fit', options.fit);
    if (options.crop) params.set('crop', options.crop);
    if (options.gravity) params.set('g', options.gravity);
    if (options.sharpen) params.set('sharpen', 'true');
    if (options.blur) params.set('blur', options.blur.toString());

    if (params.toString()) {
      optimizedUrl += (optimizedUrl.includes('?') ? '&' : '?') + params.toString();
    }

    // 메타데이터 추정 (실제로는 이미지 로드 후 계산)
    const metadata: ImageMetadata = {
      width: options.width || 0,
      height: options.height || 0,
      format: options.format || 'jpeg',
      size: 0,
      aspectRatio: (options.width && options.height) ? options.width / options.height : 1,
      hasAlpha: options.format === 'png',
      colorSpace: 'srgb',
    };

    this.cache.set(cacheKey, optimizedUrl, metadata);
    return optimizedUrl;
  }

  /**
   * 반응형 이미지 srcset 생성
   */
  generateSrcSet(
    originalUrl: string,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1536],
    options: Omit<ImageOptimizationOptions, 'width'> = {}
  ): string {
    return breakpoints
      .map(width => {
        const optimizedUrl = this.optimizeImageUrl(originalUrl, {
          ...options,
          width,
        });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  }

  /**
   * 이미지 업로드 및 최적화
   */
  async uploadAndOptimizeImage(
    file: File,
    bucket: string = 'images',
    options: ImageOptimizationOptions = {}
  ): Promise<{ url: string; metadata: ImageMetadata }> {
    try {
      // 파일 유효성 검사
      this.validateImageFile(file);

      // 이미지 메타데이터 추출
      const metadata = await this.extractImageMetadata(file);

      // 파일 이름 생성
      const fileName = this.generateFileName(file.name, options);

      // Supabase Storage에 업로드
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '31536000', // 1년 캐시
        });

      if (error) throw error;

      // 공개 URL 생성
      const { data: { publicUrl } } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      // 최적화된 URL 생성
      const optimizedUrl = this.optimizeImageUrl(publicUrl, options);

      return {
        url: optimizedUrl,
        metadata,
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  /**
   * 배치 이미지 최적화
   */
  async optimizeBatchImages(
    urls: string[],
    options: ImageOptimizationOptions = {}
  ): Promise<string[]> {
    const results: string[] = [];

    // 병렬 처리 (최대 5개 동시)
    const chunks = [];
    for (let i = 0; i < urls.length; i += 5) {
      chunks.push(urls.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(url => 
        Promise.resolve(this.optimizeImageUrl(url, options))
      );

      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to optimize image ${chunk[index]}:`, result.reason);
          results.push(chunk[index]); // 원본 URL 폴백
        }
      });
    }

    return results;
  }

  /**
   * 이미지 포맷 변환
   */
  async convertImageFormat(
    imageUrl: string,
    targetFormat: 'webp' | 'avif' | 'jpeg' | 'png'
  ): Promise<string> {
    return this.optimizeImageUrl(imageUrl, {
      format: targetFormat,
      quality: targetFormat === 'webp' || targetFormat === 'avif' ? 80 : 85,
    });
  }

  /**
   * 이미지 리사이징
   */
  async resizeImage(
    imageUrl: string,
    width: number,
    height?: number,
    fit: ImageOptimizationOptions['fit'] = 'cover'
  ): Promise<string> {
    return this.optimizeImageUrl(imageUrl, {
      width,
      height,
      fit,
    });
  }

  /**
   * 이미지 압축
   */
  async compressImage(
    imageUrl: string,
    quality: number = 75
  ): Promise<string> {
    return this.optimizeImageUrl(imageUrl, {
      quality,
    });
  }

  /**
   * 이미지 메타데이터 추출
   */
  private async extractImageMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const metadata: ImageMetadata = {
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1] || 'unknown',
          size: file.size,
          aspectRatio: img.width / img.height,
          hasAlpha: file.type === 'image/png',
          colorSpace: 'srgb',
        };
        
        resolve(metadata);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 이미지 파일 유효성 검사
   */
  private validateImageFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit: ${file.size} bytes`);
    }
  }

  /**
   * 파일 이름 생성
   */
  private generateFileName(originalName: string, options: ImageOptimizationOptions): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop() || 'jpg';
    
    let fileName = `${timestamp}-${random}.${extension}`;
    
    // 최적화 옵션에 따라 접두사 추가
    if (options.width || options.height) {
      fileName = `${options.width || 'auto'}x${options.height || 'auto'}-${fileName}`;
    }
    
    if (options.format && options.format !== extension) {
      fileName = fileName.replace(/\.[^/.]+$/, `.${options.format}`);
    }
    
    return fileName;
  }

  /**
   * CDN URL로 변환
   */
  private convertToCdnUrl(supabaseUrl: string): string {
    // Supabase Storage URL을 CDN URL로 변환
    return supabaseUrl.replace(
      /https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\//,
      `${this.cdnBaseUrl}/`
    );
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(url: string, options: ImageOptimizationOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}-${optionsStr}`;
  }

  /**
   * 캐시 관리
   */
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * 이미지 최적화 통계
   */
  async getOptimizationStats(): Promise<{
    totalImages: number;
    optimizedImages: number;
    averageSizeReduction: number;
    formatDistribution: Record<string, number>;
  }> {
    // 실제 구현에서는 데이터베이스에서 통계 조회
    return {
      totalImages: 0,
      optimizedImages: 0,
      averageSizeReduction: 0,
      formatDistribution: {},
    };
  }
}

// 싱글톤 인스턴스
export const imageOptimizationService = new ImageOptimizationService();

/**
 * 이미지 최적화 훅
 */
export function useImageOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const optimizeImage = useCallback(async (
    imageUrl: string,
    options?: ImageOptimizationOptions
  ): Promise<string> => {
    setIsOptimizing(true);
    
    try {
      const optimizedUrl = imageOptimizationService.optimizeImageUrl(imageUrl, options);
      return optimizedUrl;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  const optimizeImages = useCallback(async (
    urls: string[],
    options?: ImageOptimizationOptions
  ): Promise<string[]> => {
    setIsOptimizing(true);
    setProgress(0);

    try {
      const results = await imageOptimizationService.optimizeBatchImages(urls, options);
      setProgress(100);
      return results;
    } finally {
      setIsOptimizing(false);
      setProgress(0);
    }
  }, []);

  return {
    optimizeImage,
    optimizeImages,
    isOptimizing,
    progress,
  };
}
