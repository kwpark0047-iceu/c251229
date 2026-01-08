/**
 * 업무/스케줄 관리 서비스
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
import {
  Task,
  TaskWithLead,
  TaskType,
  TaskStatus,
  TaskPriority,
  CalendarEvent,
  CallLog,
} from './types';

// ============================================
// Task 타입 변환 헬퍼
// ============================================

function dbToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    leadId: row.lead_id as string | undefined,
    taskType: row.task_type as TaskType,
    title: row.title as string,
    description: row.description as string | undefined,
    dueDate: row.due_date as string,
    dueTime: row.due_time as string | undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assignee: row.assignee as string | undefined,
    reminderAt: row.reminder_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function taskToDb(task: Partial<Task>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (task.leadId !== undefined) result.lead_id = task.leadId || null;
  if (task.taskType !== undefined) result.task_type = task.taskType;
  if (task.title !== undefined) result.title = task.title;
  if (task.description !== undefined) result.description = task.description;
  if (task.dueDate !== undefined) result.due_date = task.dueDate;
  if (task.dueTime !== undefined) result.due_time = task.dueTime || null;
  if (task.status !== undefined) result.status = task.status;
  if (task.priority !== undefined) result.priority = task.priority;
  if (task.assignee !== undefined) result.assignee = task.assignee;
  if (task.reminderAt !== undefined) result.reminder_at = task.reminderAt;
  if (task.completedAt !== undefined) result.completed_at = task.completedAt;
  if (task.notes !== undefined) result.notes = task.notes;

  return result;
}

// ============================================
// CRUD 함수
// ============================================

/**
 * 모든 업무 조회
 */
export async function getTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: TaskType;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskWithLead[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      leads (
        id,
        biz_name,
        phone,
        road_address,
        status
      )
    `)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true, nullsFirst: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.taskType) {
    query = query.eq('task_type', filters.taskType);
  }
  if (filters?.assignee) {
    query = query.eq('assignee', filters.assignee);
  }
  if (filters?.dateFrom) {
    query = query.gte('due_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('due_date', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return (data || []).map(row => {
    const task = dbToTask(row);
    if (row.leads) {
      const lead = row.leads as Record<string, unknown>;
      task.lead = {
        id: lead.id as string,
        bizName: lead.biz_name as string,
        phone: lead.phone as string,
        roadAddress: lead.road_address as string,
        status: lead.status as 'NEW' | 'PROPOSAL_SENT' | 'CONTACTED' | 'CONTRACTED',
      };
    }
    return task as TaskWithLead;
  });
}

/**
 * 특정 리드의 업무 조회
 */
export async function getTasksByLead(leadId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by lead:', error);
    return [];
  }

  return (data || []).map(dbToTask);
}

/**
 * 특정 날짜의 업무 조회
 */
export async function getTasksByDate(date: string): Promise<TaskWithLead[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      leads (
        id,
        biz_name,
        phone,
        road_address,
        status
      )
    `)
    .eq('due_date', date)
    .order('due_time', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching tasks by date:', error);
    return [];
  }

  return (data || []).map(row => {
    const task = dbToTask(row);
    if (row.leads) {
      const lead = row.leads as Record<string, unknown>;
      task.lead = {
        id: lead.id as string,
        bizName: lead.biz_name as string,
        phone: lead.phone as string,
        roadAddress: lead.road_address as string,
        status: lead.status as 'NEW' | 'PROPOSAL_SENT' | 'CONTACTED' | 'CONTRACTED',
      };
    }
    return task as TaskWithLead;
  });
}

/**
 * 오늘 업무 조회
 */
export async function getTodayTasks(): Promise<TaskWithLead[]> {
  const today = new Date().toISOString().split('T')[0];
  return getTasksByDate(today);
}

/**
 * 이번 주 업무 조회
 */
export async function getWeekTasks(): Promise<TaskWithLead[]> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return getTasks({
    dateFrom: startOfWeek.toISOString().split('T')[0],
    dateTo: endOfWeek.toISOString().split('T')[0],
  });
}

/**
 * 업무 생성
 */
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null> {
  const dbData = taskToDb(task);

  const { data, error } = await supabase
    .from('tasks')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return dbToTask(data);
}

/**
 * 업무 수정
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const dbData = taskToDb(updates);

  const { data, error } = await supabase
    .from('tasks')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return dbToTask(data);
}

/**
 * 업무 상태 변경
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
  const updates: Record<string, unknown> = { status };

  if (status === 'COMPLETED') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating task status:', error);
    return false;
  }

  return true;
}

/**
 * 업무 삭제
 */
export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

// ============================================
// 캘린더 이벤트 (Task + Callback 통합)
// ============================================

/**
 * 캘린더 이벤트 조회 (업무 + 콜백)
 */
export async function getCalendarEvents(dateFrom: string, dateTo: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // 1. 업무(Task) 조회
  const tasks = await getTasks({ dateFrom, dateTo });
  tasks.forEach(task => {
    events.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      date: task.dueDate,
      time: task.dueTime,
      leadId: task.leadId,
      leadName: task.lead?.bizName,
      taskType: task.taskType,
      priority: task.priority,
      status: task.status,
    });
  });

  // 2. 콜백 예정 조회 (call_logs의 next_contact_date)
  const { data: callbacks, error } = await supabase
    .from('call_logs')
    .select(`
      id,
      lead_id,
      outcome,
      next_contact_date,
      next_action,
      leads (
        id,
        biz_name
      )
    `)
    .gte('next_contact_date', dateFrom)
    .lte('next_contact_date', dateTo)
    .not('next_contact_date', 'is', null);

  if (!error && callbacks) {
    callbacks.forEach(cb => {
      const leadData = cb.leads;
      const lead = Array.isArray(leadData) ? leadData[0] : leadData;
      events.push({
        id: `callback-${cb.id}`,
        type: 'callback',
        title: (cb.next_action as string) || '콜백 예정',
        date: cb.next_contact_date as string,
        leadId: cb.lead_id as string,
        leadName: (lead as { biz_name?: string } | null)?.biz_name as string | undefined,
        callOutcome: cb.outcome as CallLog['outcome'],
      });
    });
  }

  // 날짜/시간순 정렬
  events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  return events;
}

/**
 * 특정 월의 캘린더 이벤트 조회
 */
export async function getMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return getCalendarEvents(
    firstDay.toISOString().split('T')[0],
    lastDay.toISOString().split('T')[0]
  );
}

// ============================================
// 통계 함수
// ============================================

/**
 * 업무 통계
 */
export async function getTaskStats(): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  todayCount: number;
  weekCount: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('status, due_date');

  if (error || !data) {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      todayCount: 0,
      weekCount: 0,
    };
  }

  const stats = {
    total: data.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    todayCount: 0,
    weekCount: 0,
  };

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  data.forEach(row => {
    // 상태별 집계
    if (row.status === 'PENDING') stats.pending++;
    else if (row.status === 'IN_PROGRESS') stats.inProgress++;
    else if (row.status === 'COMPLETED') stats.completed++;

    // 지연 업무 (미완료 + 기한 초과)
    if (row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && row.due_date < today) {
      stats.overdue++;
    }

    // 오늘 업무
    if (row.due_date === today) {
      stats.todayCount++;
    }

    // 이번 주 업무
    if (
      row.due_date >= startOfWeek.toISOString().split('T')[0] &&
      row.due_date <= endOfWeek.toISOString().split('T')[0]
    ) {
      stats.weekCount++;
    }
  });

  return stats;
}

/**
 * 담당자별 업무 집계
 */
export async function getTasksByAssignee(): Promise<
  { assignee: string; total: number; completed: number; pending: number }[]
> {
  const { data, error } = await supabase
    .from('tasks')
    .select('assignee, status');

  if (error || !data) {
    return [];
  }

  const assigneeMap = new Map<string, { total: number; completed: number; pending: number }>();

  data.forEach(row => {
    const assignee = row.assignee || '미지정';
    if (!assigneeMap.has(assignee)) {
      assigneeMap.set(assignee, { total: 0, completed: 0, pending: 0 });
    }

    const stats = assigneeMap.get(assignee)!;
    stats.total++;
    if (row.status === 'COMPLETED') stats.completed++;
    else if (row.status === 'PENDING' || row.status === 'IN_PROGRESS') stats.pending++;
  });

  return Array.from(assigneeMap.entries()).map(([assignee, stats]) => ({
    assignee,
    ...stats,
  }));
}
