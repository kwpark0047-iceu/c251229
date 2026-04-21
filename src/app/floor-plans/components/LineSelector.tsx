'use client';

/**
 * 노선 선택 탭 컴포넌트
 * 1,2,5,7,8호선 선택
 */

import React from 'react';
import { Train } from 'lucide-react';
import { MetroLine, METRO_LINES, METRO_LINE_NAMES, METRO_LINE_COLORS } from '../types';

interface LineSelectorProps {
  selectedLine: MetroLine;
  onLineChange: (line: MetroLine) => void;
  planCounts?: Partial<Record<MetroLine, { station_layout: number; psd: number }>>;
}

export default function LineSelector({
  selectedLine,
  onLineChange,
  planCounts,
}: LineSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
      {METRO_LINES.map((line) => {
        const isSelected = selectedLine === line;
        const color = METRO_LINE_COLORS[line];
        const totalCount = planCounts && planCounts[line]
          ? (planCounts[line].station_layout || 0) + (planCounts[line].psd || 0)
          : 0;

        return (
          <button
            key={line}
            onClick={() => onLineChange(line)}
            className={`
              group relative flex items-center gap-2 px-4 py-2.5 rounded-xl
              border transition-all duration-300 overflow-hidden
              ${isSelected
                ? 'border-transparent shadow-[0_4px_15_var(--line-glow)] bg-[image:var(--line-gradient)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--glass-border)]'
              }
            `}
            /* eslint-disable-next-line react/forbid-dom-props */
            style={{
              '--line-gradient': isSelected ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` : 'none',
              '--line-glow': isSelected ? `${color}40` : 'transparent',
            } as React.CSSProperties}
          >
            {/* 호버 글로우 */}
            {!isSelected && (
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[image:var(--hover-glow)]"
                /* eslint-disable-next-line react/forbid-dom-props */
                style={{
                  '--hover-glow': `radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 70%)`,
                } as React.CSSProperties}
              />
            )}

            <Train
              className={`w-4 h-4 relative ${isSelected ? 'text-white' : 'text-[--line-color]'}`}
              /* eslint-disable-next-line react/forbid-dom-props */
              style={{ 
                '--line-color': isSelected ? 'inherit' : color,
              } as React.CSSProperties}
            />
            <span
              className={`relative font-semibold text-sm ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}
            >
              {METRO_LINE_NAMES[line]}
            </span>

            {/* 도면 개수 배지 */}
            {totalCount > 0 && (
              <span
                className={`
                  relative px-2 py-0.5 rounded-full text-xs font-medium
                  ${isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  }
                `}
              >
                {totalCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
