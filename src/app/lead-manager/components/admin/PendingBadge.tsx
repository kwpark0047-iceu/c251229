'use client';

import React from 'react';

interface PendingBadgeProps {
  count: number;
}

export function PendingBadge({ count }: PendingBadgeProps) {
  return (
    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-bold">
      {count} pending
    </span>
  );
}