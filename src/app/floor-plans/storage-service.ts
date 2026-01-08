/**
 * 지하철 역사 도면 페이지 - Storage 서비스
 * Supabase Storage를 이용한 이미지 업로드/다운로드
 */

import { createClient } from '@/lib/supabase/client';
import {
  MetroLine,
  PlanType,
  StorageResult,
  BulkUploadResult,
  FloorPlanInput,
  parseFloorPlanPath,
} from './types';
import { saveFloorPlan } from './floor-plan-service';

const BUCKET_NAME = 'floor-plans';

/**
 * Supabase 클라이언트 가져오기
 */
function getSupabase() {
  return createClient();
}

/**
 * Storage 경로 생성
 */
function createStoragePath(
  lineNumber: MetroLine,
  planType: PlanType,
  fileName: string
): string {
  const typeFolder = planType === 'psd' ? 'psd' : 'station-layout';
  return `line-${lineNumber}/${typeFolder}/${fileName}`;
}

/**
 * 단일 이미지 업로드
 */
export async function uploadFloorPlanImage(
  file: File,
  lineNumber: MetroLine,
  planType: PlanType,
  stationName: string,
  sortOrder: number = 0
): Promise<StorageResult> {
  try {
    const supabase = getSupabase();
    const storagePath = createStoragePath(lineNumber, planType, file.name);

    // Storage에 업로드
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // DB에 저장
    const input: FloorPlanInput = {
      stationName,
      lineNumber,
      planType,
      imageUrl: urlData.publicUrl,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      sortOrder,
    };

    await saveFloorPlan(input);

    return {
      success: true,
      storagePath,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 로컬 파일에서 일괄 업로드 (파일명 파싱)
 */
export async function uploadBulkFromFiles(
  files: FileList | File[],
  folderName: string,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<BulkUploadResult> {
  const results: BulkUploadResult['results'] = [];
  let uploaded = 0;
  let failed = 0;

  const fileArray = Array.from(files);
  const total = fileArray.length;

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    onProgress?.(i, total, `업로드 중: ${file.name}`);

    // 파일명 파싱
    const parsed = parseFloorPlanPath(folderName, file.name, file.name);

    if (!parsed) {
      // 파싱 실패 (표지, 노선도 등)
      results.push({
        fileName: file.name,
        success: false,
        error: '파일명 파싱 실패 (표지/노선도 건너뜀)',
      });
      failed++;
      continue;
    }

    const result = await uploadFloorPlanImage(
      file,
      parsed.lineNumber,
      parsed.planType,
      parsed.stationName,
      parsed.sortOrder
    );

    results.push({
      fileName: file.name,
      success: result.success,
      storagePath: result.storagePath,
      publicUrl: result.publicUrl,
      error: result.error,
    });

    if (result.success) {
      uploaded++;
    } else {
      failed++;
    }
  }

  onProgress?.(total, total, '업로드 완료');

  return {
    success: failed === 0,
    uploaded,
    failed,
    results,
  };
}

/**
 * URL에서 이미지 다운로드
 */
export async function downloadFloorPlanImage(
  imageUrl: string,
  fileName?: string
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // 브라우저에서 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'floor-plan.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('이미지 다운로드 오류:', error);
    throw error;
  }
}

/**
 * 여러 이미지 ZIP으로 다운로드
 */
export async function downloadFloorPlansAsZip(
  images: { imageUrl: string; fileName: string }[],
  zipFileName: string = 'floor-plans.zip',
  onProgress?: (current: number, total: number, status: string) => void
): Promise<void> {
  // 동적으로 JSZip 로드
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const total = images.length;

  for (let i = 0; i < total; i++) {
    const { imageUrl, fileName } = images[i];
    onProgress?.(i, total, `다운로드 중: ${fileName}`);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      zip.file(fileName, blob);
    } catch (error) {
      console.error(`이미지 다운로드 실패: ${fileName}`, error);
    }
  }

  onProgress?.(total, total, 'ZIP 파일 생성 중...');

  // ZIP 생성 및 다운로드
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Storage에서 이미지 삭제
 */
export async function deleteFloorPlanImage(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error('Storage 삭제 오류:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('이미지 삭제 오류:', error);
    return false;
  }
}

/**
 * Public URL 가져오기
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Storage 버킷 생성 (없는 경우)
 */
export async function ensureBucketExists(): Promise<boolean> {
  try {
    const supabase = getSupabase();

    // 버킷 목록 조회
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('버킷 목록 조회 오류:', listError);
      return false;
    }

    // 이미 존재하는지 확인
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    if (exists) {
      return true;
    }

    // 버킷 생성
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (createError) {
      console.error('버킷 생성 오류:', createError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('버킷 확인 오류:', error);
    return false;
  }
}

/**
 * 로컬 경로에서 FloorPlanInput 배열 생성 (서버 사이드용)
 */
export function parseLocalFilesToInputs(
  files: { folderName: string; fileName: string; fullPath: string }[]
): FloorPlanInput[] {
  const inputs: FloorPlanInput[] = [];

  for (const file of files) {
    const parsed = parseFloorPlanPath(file.folderName, file.fileName, file.fullPath);
    if (!parsed) continue;

    inputs.push({
      stationName: parsed.stationName,
      lineNumber: parsed.lineNumber,
      planType: parsed.planType,
      imageUrl: '', // 업로드 후 설정
      fileName: parsed.fileName,
      sortOrder: parsed.sortOrder,
    });
  }

  return inputs;
}
