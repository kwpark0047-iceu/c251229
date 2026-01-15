/**
 * 최적화된 이미지 컴포넌트
 * 지연 로딩, WebP, 프로그레시브 로딩
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // 우선 로딩 (LCP 최적화)
  placeholder?: 'blur' | 'empty' | 'color';
  blurDataURL?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// 이미지 포맷 지원 확인
const supportsWebP = (() => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

const supportsAVIF = (() => {
  if (typeof window === 'undefined') return false;
  
  const avif = new Image();
  return new Promise(resolve => {
    avif.onload = () => resolve(avif.width > 0 && avif.height > 0);
    avif.onerror = () => resolve(false);
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcmAAAACWthcmYAAAAAAAAAAaWxzdAAAADWCAAEAAAAAAAFaG1kZQAAAAAAAAACAA';
  });
})();

// 이미지 URL 최적화
function optimizeImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }
): string {
  const url = new URL(src, window.location.origin);
  
  // CDN 파라미터 추가 (Cloudinary, Imgix 등)
  if (options.width) url.searchParams.set('w', options.width.toString());
  if (options.height) url.searchParams.set('h', options.height.toString());
  if (options.quality) url.searchParams.set('q', options.quality.toString());
  if (options.format) url.searchParams.set('f', options.format);
  
  return url.toString();
}

// 저화질 이미지 플레이스홀더 생성
function generateBlurDataURL(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);
  
  // 노이즈 추가
  for (let i = 0; i < width * height * 0.1; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const opacity = Math.random() * 0.1;
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  return canvas.toDataURL();
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  quality = 75,
  format = 'auto',
  sizes = '100vw',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 이미지 소스 결정
  const getImageSrc = useCallback(async () => {
    let finalFormat = format;
    
    if (format === 'auto') {
      if (await supportsAVIF) {
        finalFormat = 'avif';
      } else if (supportsWebP) {
        finalFormat = 'webp';
      } else {
        finalFormat = 'jpeg';
      }
    }

    return optimizeImageUrl(src, {
      width,
      height,
      quality,
      format: finalFormat,
    });
  }, [src, width, height, quality, format]);

  // 이미지 로딩
  const loadImage = useCallback(async () => {
    try {
      const imageSrc = await getImageSrc();
      setCurrentSrc(imageSrc);
    } catch (error) {
      console.error('Image optimization failed:', error);
      setCurrentSrc(src); // 폴백
    }
  }, [getImageSrc, src]);

  // 지연 로딩 설정
  useEffect(() => {
    if (priority || !imgRef.current) {
      loadImage();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadImage();
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // 50px 미리 로드
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, loadImage]);

  // 이미지 로드 완료 핸들러
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // 이미지 로드 실패 핸들러
  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  // 플레이스홀더 이미지 생성
  const placeholderSrc = blurDataURL || 
    (width && height ? generateBlurDataURL(width, height) : null);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* 플레이스홀더 */}
      {placeholder === 'blur' && placeholderSrc && !isLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          aria-hidden="true"
        />
      )}
      
      {placeholder === 'color' && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* 메인 이미지 */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* 에러 상태 */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">이미지를 불러올 수 없습니다</p>
          </div>
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {!isLoaded && !isError && placeholder === 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}

/**
 * 갤러리 이미지 컴포넌트
 */
export function GalleryImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg">
      <OptimizedImage
        src={src}
        alt={alt}
        className={cn(
          'transition-transform duration-300 group-hover:scale-105',
          className
        )}
        {...props}
      />
      
      {/* 오버레이 효과 */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300" />
    </div>
  );
}

/**
 * 아바타 이미지 컴포넌트
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number;
}) {
  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-gray-200',
        className
      )}
      style={{ width: size, height: size }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        placeholder="blur"
        {...props}
      />
    </div>
  );
}

/**
 * 배경 이미지 컴포넌트
 */
export function BackgroundImage({
  src,
  alt,
  children,
  className,
  ...props
}: OptimizedImageProps & {
  children?: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
      
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* 콘텐츠 */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* 로딩 상태 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 animate-pulse" />
      )}
    </div>
  );
}
