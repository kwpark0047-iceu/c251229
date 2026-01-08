'use client';

/**
 * 업무현황 보드 컴포넌트
 * 칸반 스타일로 업무 상태별 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Calendar,
  FileText,
  Users,
  CircleDot,
  Clock,
  AlertTriangle,
  Check,
  X,
  MoreVertical,
  MapPin,
  Loader2,
} from 'lucide-react';
import {
  TaskWithLead,
  TaskType,
  TaskStatus,
  TaskPriority,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '../../types';
import { getTasks, updateTaskStatus, deleteTask, getTaskStats } from '../../task-service';

interface TaskBoardProps {
  onTaskClick?: (task: TaskWithLead) => void;
  onEditTask?: (task: TaskWithLead) => void;
}

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  CALL: <Phone className="w-4 h-4" />,
  MEETING: <Users className="w-4 h-4" />,
  PROPOSAL: <FileText className="w-4 h-4" />,
  FOLLOW_UP: <CircleDot className="w-4 h-4" />,
  CONTRACT: <Calendar className="w-4 h-4" />,
  OTHER: <CircleDot className="w-4 h-4" />,
};

const STATUS_COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'PENDING', label: '대기', icon: <Clock className="w-4 h-4" />, color: 'var(--text-muted)' },
  { status: 'IN_PROGRESS', label: '진행중', icon: <Loader2 className="w-4 h-4" />, color: 'var(--metro-line4)' },
  { status: 'COMPLETED', label: '완료', icon: <Check className="w-4 h-4" />, color: 'var(--metro-line2)' },
];

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onClick,
}: {
  task: TaskWithLead;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const typeColors = TASK_TYPE_COLORS[task.taskType];
  const priorityColors = TASK_PRIORITY_COLORS[task.priority];

  const isOverdue =
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED' &&
    new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return '오늘';
    }
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return '내일';
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
        isOverdue ? 'border-red-400/50' : ''
      }`}
      style={{
        background: 'var(--bg-secondary)',
        borderColor: isOverdue ? undefined : 'var(--border-subtle)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${typeColors.bg} ${typeColors.text}`}
        >
          {TASK_ICONS[task.taskType]}
          {TASK_TYPE_LABELS[task.taskType]}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 py-1 rounded-lg border shadow-lg z-10 min-w-[120px]"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              {STATUS_COLUMNS.map((col) => (
                <button
                  key={col.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(col.status);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {col.icon}
                  {col.label}로 변경
                </button>
              ))}
              <hr style={{ borderColor: 'var(--border-subtle)' }} className="my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('이 업무를 삭제하시겠습니까?')) {
                    onDelete();
                  }
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 제목 */}
      <h4 className="font-semibold text-[var(--text-primary)] mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* 리드 정보 */}
      {task.lead && (
        <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--metro-line7)]" />
          <span className="truncate">{task.lead.bizName}</span>
        </div>
      )}

      {/* 날짜/시간/우선순위 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
            isOverdue ? 'bg-red-100 text-red-600' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
          }`}
        >
          {isOverdue && <AlertTriangle className="w-3 h-3" />}
          <Calendar className="w-3 h-3" />
          {formatDate(task.dueDate)}
          {task.dueTime && ` ${task.dueTime.slice(0, 5)}`}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-lg ${priorityColors.bg} ${priorityColors.text}`}
        >
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
      </div>
    </div>
  );
}

export default function TaskBoard({ onTaskClick, onEditTask }: TaskBoardProps) {
  const [tasks, setTasks] = useState<TaskWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    todayCount: 0,
    weekCount: 0,
  });
  const [filter, setFilter] = useState<{
    taskType?: TaskType;
    priority?: TaskPriority;
  }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasksData, statsData] = await Promise.all([
      getTasks({
        taskType: filter.taskType,
        priority: filter.priority,
      }),
      getTaskStats(),
    ]);
    setTasks(tasksData);
    setStats(statsData);
    setLoading(false);
  }, [filter.taskType, filter.priority]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await updateTaskStatus(taskId, status);
    loadData();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    loadData();
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="text-sm text-[var(--text-muted)] mb-1">오늘 업무</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.todayCount}
          </div>
        </div>
        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="text-sm text-[var(--text-muted)] mb-1">이번 주</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stats.weekCount}
          </div>
        </div>
        <div
          className="p-4 rounded-xl border"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="text-sm text-[var(--text-muted)] mb-1">진행중</div>
          <div className="text-2xl font-bold text-[var(--metro-line4)]">
            {stats.inProgress}
          </div>
        </div>
        <div
          className="p-4 rounded-xl border"
          style={{
            background: stats.overdue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
            borderColor: stats.overdue > 0 ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)',
          }}
        >
          <div className="text-sm text-[var(--text-muted)] mb-1 flex items-center gap-1">
            {stats.overdue > 0 && <AlertTriangle className="w-4 h-4 text-red-400" />}
            지연 업무
          </div>
          <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
            {stats.overdue}
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filter.taskType || ''}
          onChange={(e) =>
            setFilter({ ...filter, taskType: (e.target.value || undefined) as TaskType | undefined })
          }
          className="metro-input !w-auto"
        >
          <option value="">전체 유형</option>
          {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filter.priority || ''}
          onChange={(e) =>
            setFilter({ ...filter, priority: (e.target.value || undefined) as TaskPriority | undefined })
          }
          className="metro-input !w-auto"
        >
          <option value="">전체 우선순위</option>
          {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 칸반 보드 */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.status);

            return (
              <div
                key={column.status}
                className="rounded-2xl border p-4"
                style={{
                  background: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              >
                {/* 컬럼 헤더 */}
                <div className="flex items-center gap-2 mb-4">
                  <span style={{ color: column.color }}>{column.icon}</span>
                  <h3
                    className="font-semibold"
                    style={{ color: column.color }}
                  >
                    {column.label}
                  </h3>
                  <span
                    className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* 태스크 목록 */}
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                      업무가 없습니다
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(status) => handleStatusChange(task.id, status)}
                        onDelete={() => handleDelete(task.id)}
                        onClick={() => {
                          onTaskClick?.(task);
                          onEditTask?.(task);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
