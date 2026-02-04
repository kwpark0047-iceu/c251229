'use client';

/**
 * 스케줄 캘린더 컴포넌트
 * 월간 달력 형태로 업무 및 콜백 일정을 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar,
  FileText,
  Users,
  CircleDot,
  Plus,
} from 'lucide-react';
import {
  CalendarEvent,
  TaskType,
  TaskPriority,
  TASK_TYPE_COLORS,
  TASK_PRIORITY_COLORS,
} from '../../types';
import { getMonthEvents } from '../../task-service';

interface ScheduleCalendarProps {
  onDateSelect?: (date: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onAddTask?: (date: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const TASK_ICONS: Record<TaskType, React.ReactNode> = {
  CALL: <Phone className="w-3 h-3" />,
  MEETING: <Users className="w-3 h-3" />,
  PROPOSAL: <FileText className="w-3 h-3" />,
  FOLLOW_UP: <CircleDot className="w-3 h-3" />,
  CONTRACT: <Calendar className="w-3 h-3" />,
  OTHER: <CircleDot className="w-3 h-3" />,
};

export default function ScheduleCalendar({
  onDateSelect,
  onEventClick,
  onAddTask,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await getMonthEvents(year, month);
    setEvents(data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  // 캘린더 데이터 생성
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // 이전 달 날짜들
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // 현재 달 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // 다음 달 날짜들 (6주 채우기)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    onDateSelect?.(dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    onDateSelect?.(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getPriorityDot = (priority?: TaskPriority) => {
    if (!priority) return null;
    const colors = TASK_PRIORITY_COLORS[priority];
    return (
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${colors.bg.replace('100', '500')}`}
      />
    );
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {year}년 {month + 1}월
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          오늘
        </button>
      </div>

      {/* 요일 헤더 */}
      <div
        className="grid grid-cols-7 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-semibold ${index === 0
                ? 'text-red-400'
                : index === 6
                  ? 'text-blue-400'
                  : 'text-[var(--text-muted)]'
              }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 본문 */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-[var(--text-muted)]">로딩 중...</div>
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = getEventsForDate(date);
            const isSelected = selectedDate === dateStr;
            const isTodayDate = isToday(date);
            const dayOfWeek = date.getDay();

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-[120px] p-3 border-b border-r cursor-pointer transition-all duration-300 group relative ${isCurrentMonth
                    ? 'hover:bg-[var(--bg-secondary)] hover:shadow-inner'
                    : 'bg-[var(--bg-tertiary)] opacity-30'
                  } ${isSelected ? 'bg-[var(--metro-line4)]/5 !border-[var(--metro-line4)]/30' : ''}`}
                style={{
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {/* 호버 배경 효과 */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--metro-line4)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* 날짜 */}
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span
                    className={`text-sm font-bold transition-all ${isTodayDate
                        ? 'w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--metro-line2)] to-[#00c55a] text-white shadow-lg shadow-green-500/30 scale-110'
                        : isSelected
                          ? 'text-[var(--metro-line4)] underline decoration-2 underline-offset-4'
                          : dayOfWeek === 0
                            ? 'text-red-400'
                            : dayOfWeek === 6
                              ? 'text-blue-400'
                              : 'text-[var(--text-primary)]'
                      }`}
                  >
                    {date.getDate()}
                  </span>
                  {isCurrentMonth && onAddTask && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-tertiary)] transition-all"
                    >
                      <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  )}
                </div>

                {/* 이벤트 목록 */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => {
                    const typeColors = event.taskType
                      ? TASK_TYPE_COLORS[event.taskType]
                      : { bg: 'bg-gray-100', text: 'text-gray-700' };

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium truncate cursor-pointer hover:scale-105 active:scale-95 transition-all animate-float-subtle border ${event.type === 'callback'
                            ? 'bg-amber-100/10 text-amber-500 border-amber-500/20'
                            : `${typeColors.bg.replace('100', '100/10')} ${typeColors.text} border-${typeColors.text.split('-')[1]}-500/20`
                          }`}
                        title={event.title}
                        style={{
                          animationDelay: `${index * 200}ms`
                        }}
                      >
                        {event.type === 'task' && event.taskType && (
                          <span className="shrink-0">{TASK_ICONS[event.taskType]}</span>
                        )}
                        {event.type === 'callback' && <Phone className="shrink-0 w-3 h-3" />}
                        <span className="truncate flex-1">{event.title}</span>
                        {getPriorityDot(event.priority)}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-[var(--text-muted)] px-1.5">
                      +{dayEvents.length - 3}개
                    </div>
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
