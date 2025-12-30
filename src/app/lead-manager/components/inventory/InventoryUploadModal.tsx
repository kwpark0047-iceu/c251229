'use client';

/**
 * 인벤토리 엑셀 업로드 모달
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { ExcelUploadResult } from '../../types';
import { uploadInventoryExcel } from '../../inventory-service';

interface InventoryUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryUploadModal({
  onClose,
  onSuccess,
}: InventoryUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ExcelUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 엑셀 파일 확인
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
        alert('엑셀 파일(.xlsx)만 업로드 가능합니다.');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress({ current: 0, total: 0 });

    const uploadResult = await uploadInventoryExcel(file, (current, total) => {
      setProgress({ current, total });
    });

    setResult(uploadResult);
    setUploading(false);

    if (uploadResult.success) {
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-slate-800">인벤토리 업로드</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 space-y-6">
          {/* 드래그 앤 드롭 영역 */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-green-300 bg-green-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="font-medium text-slate-700">
                  엑셀 파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-sm text-slate-500">
                  .xlsx 형식만 지원됩니다
                </p>
              </div>
            )}
          </div>

          {/* 필수 컬럼 안내 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              필수 컬럼
            </h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 역명 (station_name)</li>
              <li>• 위치코드 (location_code)</li>
              <li>• 광고유형 (ad_type)</li>
            </ul>
            <h3 className="text-sm font-medium text-slate-700 mt-3 mb-2">
              선택 컬럼
            </h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 크기, 월단가, 주단가, 상태, 설명</li>
            </ul>
          </div>

          {/* 진행 상태 */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">업로드 중...</span>
                <span className="text-slate-600">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.success ? '업로드 완료' : '업로드 실패'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    전체 {result.rowCount}건 중 {result.successCount}건 성공,{' '}
                    {result.errorCount}건 실패
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-600 space-y-1">
                      {result.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>
                          행 {err.row}: {err.message}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... 외 {result.errors.length - 5}건</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
