'use client';

/**
 * 도면 업로드 모달
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  MetroLine,
  PlanType,
  METRO_LINES,
  METRO_LINE_NAMES,
  METRO_LINE_COLORS,
  PLAN_TYPE_LABELS,
} from '../types';

interface UploadResult {
  fileName: string;
  success: boolean;
  publicUrl?: string;
  error?: string;
}

interface FloorPlanUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultLine?: MetroLine;
}

export default function FloorPlanUploadModal({
  isOpen,
  onClose,
  onSuccess,
  defaultLine = '2',
}: FloorPlanUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [lineNumber, setLineNumber] = useState<MetroLine>(defaultLine);
  const [planType, setPlanType] = useState<PlanType>('station_layout');
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(f =>
      f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.png')
    );
    setFiles(prev => [...prev, ...imageFiles]);
    setError(null);
    setResults([]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(f =>
      f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.png')
    );
    setFiles(prev => [...prev, ...imageFiles]);
    setError(null);
    setResults([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('업로드할 파일을 선택하세요');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('lineNumber', lineNumber);
      formData.append('planType', planType);

      const response = await fetch('/api/floor-plans/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패');
      }

      setResults(data.results || []);

      if (data.success || data.uploaded > 0) {
        // 성공 시 콜백
        setTimeout(() => {
          onSuccess();
          if (data.failed === 0) {
            handleClose();
          }
        }, 1500);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setResults([]);
    setError(null);
    onClose();
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--glass-border)] p-6"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">도면 업로드</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 설정 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* 노선 선택 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              노선
            </label>
            <select
              value={lineNumber}
              onChange={(e) => setLineNumber(e.target.value as MetroLine)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--metro-line2)]"
            >
              {METRO_LINES.map((line) => (
                <option key={line} value={line}>
                  {METRO_LINE_NAMES[line]}
                </option>
              ))}
            </select>
          </div>

          {/* 도면 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              도면 유형
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--metro-line2)]"
            >
              <option value="station_layout">{PLAN_TYPE_LABELS.station_layout}</option>
              <option value="psd">{PLAN_TYPE_LABELS.psd}</option>
            </select>
          </div>
        </div>

        {/* 파일 드롭존 */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--metro-line2)] hover:bg-[var(--bg-tertiary)] transition-colors mb-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-[var(--text-primary)] font-medium mb-1">
            클릭하거나 파일을 드래그하세요
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            JPG, JPEG, PNG 파일 지원
          </p>
        </div>

        {/* 선택된 파일 목록 */}
        {files.length > 0 && (
          <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2 rounded-lg bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-3">
                  <FileImage className="w-4 h-4 text-[var(--metro-line4)]" />
                  <span className="text-sm text-[var(--text-primary)] truncate max-w-[300px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 업로드 결과 */}
        {results.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--bg-tertiary)]">
            <div className="flex items-center gap-4 mb-3">
              {successCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--metro-line2)]">
                  <CheckCircle className="w-4 h-4" />
                  성공 {successCount}개
                </span>
              )}
              {failCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  실패 {failCount}개
                </span>
              )}
            </div>
            {failCount > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {results
                  .filter((r) => !r.success)
                  .map((r, i) => (
                    <p key={i} className="text-xs text-red-400">
                      {r.fileName}: {r.error}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium disabled:opacity-50 transition-opacity"
            style={{ background: METRO_LINE_COLORS[lineNumber] }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {files.length}개 파일 업로드
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
