'use client';

import { useEffect, useState } from 'react';
import { addFilter, parseFilters, type FilterConditions, type SavedFilter } from '../saved-filters';

interface Props {
  scope: string;
  value: FilterConditions;
  onApply: (value: FilterConditions) => void;
}

export default function SavedFilters(props: Props) {
  return <ScopedSavedFilters key={props.scope} {...props} />;
}

function ScopedSavedFilters({ scope, value, onApply }: Props) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => {
      try { setFilters(parseFilters(localStorage.getItem(scope))); }
      catch { setMessage('브라우저 저장소를 사용할 수 없습니다.'); }
      setReady(true);
    };
    load();
    const changed = (event: StorageEvent) => { if (event.key === scope || event.key === null) load(); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [scope]);

  const save = () => {
    try {
      const current = parseFilters(localStorage.getItem(scope));
      const next = addFilter(current, name, value, crypto.randomUUID());
      try { localStorage.setItem(scope, JSON.stringify(next)); }
      catch { setMessage('필터를 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.'); return; }
      setFilters(next); setName(''); setMessage('현재 조건을 저장했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '필터를 저장하지 못했습니다.'); }
  };
  const remove = (id: string) => {
    try {
      const next = parseFilters(localStorage.getItem(scope)).filter(f => f.id !== id);
      localStorage.setItem(scope, JSON.stringify(next));
      setFilters(next); setMessage('저장 필터를 삭제했습니다.');
    } catch { setMessage('필터를 삭제하지 못했습니다. 다시 시도해주세요.'); }
  };
  return (
    <section aria-label="개인 저장 필터" className="flex flex-col gap-2 py-3 border-t border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="saved-filter-name" className="text-xs font-medium">내 필터</label>
        <input id="saved-filter-name" aria-label="필터 이름" value={name} maxLength={24} onChange={e => setName(e.target.value)} placeholder="예: 서울 신규 리드" className="min-h-11 w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 text-sm" />
        <button type="button" disabled={!ready || !name.trim()} onClick={save} className="min-h-11 rounded-lg px-3 text-sm border border-[var(--border-subtle)] disabled:opacity-50 focus-visible:outline-2">현재 조건 저장</button>
        {filters.map(filter => (
          <div key={filter.id} className="flex items-center rounded-lg border border-[var(--border-subtle)]">
            <button type="button" aria-label={`${filter.name} 적용`} onClick={() => { onApply(filter.conditions); setMessage(`${filter.name} 필터를 적용했습니다.`); }} className="min-h-11 px-3 text-sm focus-visible:outline-2">{filter.name}</button>
            <button type="button" aria-label={`${filter.name} 삭제`} onClick={() => remove(filter.id)} className="min-h-11 px-3 text-xs text-[var(--text-muted)] focus-visible:outline-2">삭제</button>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)]">이 브라우저에만 저장됩니다. 적용 시 검색어·세부 업종은 초기화되며 날짜는 유지됩니다.</p>
      <p role="status" className="text-xs text-[var(--text-secondary)]">{message}</p>
    </section>
  );
}
