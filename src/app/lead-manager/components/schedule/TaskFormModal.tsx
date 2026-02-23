'use client';

/**
 * 업무 추가/수정 모달
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MapPin, FileText, Loader2 } from 'lucide-react';
import './TaskFormModal.css';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  Lead,
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '../../types';
import { createTask, updateTask } from '../../task-service';
import { getLeads } from '../../supabase-service';

interface TaskFormModalProps {
  task?: Task | null;
  defaultDate?: string;
  defaultLeadId?: string;
  onSave: () => void;
  onClose: () => void;
}

export default function TaskFormModal({
  task,
  defaultDate,
  defaultLeadId,
  onSave,
  onClose,
}: TaskFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<{
    leadId: string;
    taskType: TaskType;
    title: string;
    description: string;
    dueDate: string;
    dueTime: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee: string;
    notes: string;
  }>({
    leadId: task?.leadId || defaultLeadId || '',
    taskType: task?.taskType || 'CALL',
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.dueDate || defaultDate || new Date().toISOString().split('T')[0],
    dueTime: task?.dueTime || '',
    status: task?.status || 'PENDING',
    priority: task?.priority || 'MEDIUM',
    assignee: task?.assignee || '',
    notes: task?.notes || '',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    const result = await getLeads();
    if (result.success) {
      setLeads(result.leads);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.bizName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.roadAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        leadId: formData.leadId || undefined,
        taskType: formData.taskType,
        title: formData.title,
        description: formData.description || undefined,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime || undefined,
        status: formData.status,
        priority: formData.priority,
        assignee: formData.assignee || undefined,
        notes: formData.notes || undefined,
      };

      if (task?.id) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 backdrop-blur-md task-form-overlay"
        onClick={onClose}
      />

      {/* 모달 */}
      <div
        className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-3xl border animate-fade-in-up task-form-container"
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-8 py-5 border-b sticky top-0 z-20 task-form-header"
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {task?.id ? '업무 수정' : '새 업무 등록'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {task?.id ? '기존 업무 내용을 변경합니다.' : '새로운 영업 활동을 계획합니다.'}
            </p>
          </div>
          <button
            onClick={onClose}
            title="닫기"
            className="p-2 rounded-xl hover:bg-white/10 transition-all hover:rotate-90"
          >
            <X className="w-6 h-6 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 업무 유형 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <FileText className="w-4 h-4 text-[var(--metro-line4)]" />
              업무 유형
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TASK_TYPE_LABELS) as [TaskType, string][]).map(
                ([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, taskType: type })}
                    title={label}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${formData.taskType === type
                      ? 'border-[var(--metro-line4)] bg-[var(--metro-line4)]/10 text-[var(--metro-line4)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-sm font-semibold text-[var(--text-secondary)] mb-2 block">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="metro-input"
              placeholder="업무 제목"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-sm font-semibold text-[var(--text-secondary)] mb-2 block">
              설명
            </label>
            <textarea
              id="task-description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="metro-input min-h-[80px]"
              placeholder="업무 내용 설명"
            />
          </div>

          {/* 날짜/시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-date" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
                <Calendar className="w-4 h-4 text-[var(--metro-line3)]" />
                날짜 <span className="text-red-400">*</span>
              </label>
              <input
                id="task-date"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="metro-input"
                required
              />
            </div>
            <div>
              <label htmlFor="task-time" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
                <Clock className="w-4 h-4 text-[var(--metro-line5)]" />
                시간
              </label>
              <input
                id="task-time"
                name="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="metro-input"
              />
            </div>
          </div>

          {/* 우선순위 */}
          <div>
            <label className="text-sm font-semibold text-[var(--text-secondary)] mb-2 block">
              우선순위
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(
                ([priority, label]) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${formData.priority === priority
                      ? priority === 'URGENT'
                        ? 'border-red-400 bg-red-400/10 text-red-400'
                        : priority === 'HIGH'
                          ? 'border-orange-400 bg-orange-400/10 text-orange-400'
                          : 'border-[var(--metro-line4)] bg-[var(--metro-line4)]/10 text-[var(--metro-line4)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 상태 (편집 시에만) */}
          {task?.id && (
            <div>
              <label htmlFor="task-status" className="text-sm font-semibold text-[var(--text-secondary)] mb-2 block">
                상태
              </label>
              <select
                id="task-status"
                name="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TaskStatus })
                }
                className="metro-input"
              >
                {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(
                  ([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* 담당자 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <User className="w-4 h-4 text-[var(--metro-line7)]" />
              담당자
            </label>
            <input
              id="task-assignee"
              name="assignee"
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="metro-input"
              placeholder="담당자 이름"
            />
          </div>

          {/* 연결 리드 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-2">
              <MapPin className="w-4 h-4 text-[var(--metro-line2)]" />
              연결 리드
            </label>
            <input
              id="lead-search-query"
              name="searchQuery"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="metro-input mb-2"
              placeholder="리드 검색..."
            />
            {searchQuery && (
              <div
                className="max-h-40 overflow-y-auto rounded-lg border"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                }}
              >
                {filteredLeads.slice(0, 10).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, leadId: lead.id });
                      setSearchQuery(lead.bizName);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors ${formData.leadId === lead.id
                      ? 'bg-[var(--metro-line4)]/10 text-[var(--metro-line4)]'
                      : 'text-[var(--text-secondary)]'
                      }`}
                  >
                    <div className="font-medium">{lead.bizName}</div>
                    {lead.roadAddress && (
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        {lead.roadAddress}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {formData.leadId && !searchQuery && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  {leads.find((l) => l.id === formData.leadId)?.bizName || '선택된 리드'}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, leadId: '' })}
                  title="연결 해제"
                  className="ml-auto text-[var(--text-muted)] hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="text-sm font-semibold text-[var(--text-secondary)] mb-2 block">
              메모
            </label>
            <textarea
              id="task-notes"
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="metro-input min-h-[60px]"
              placeholder="추가 메모"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl border font-semibold transition-all hover:bg-[var(--bg-secondary)]"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background:
                  'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                boxShadow: '0 4px 15px rgba(60, 181, 74, 0.3)',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task?.id ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
