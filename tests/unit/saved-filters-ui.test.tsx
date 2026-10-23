import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SavedFilters from '@/app/lead-manager/components/SavedFilters';
const value = { category: 'ALL', regions: ['6110000'], status: 'NEW', view: 'grid', uncontacted: false, score: false } as const;
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
describe('저장 필터 조작', () => {
  it('저장·적용·삭제를 처리한다', () => {
    const apply = vi.fn();
    render(<SavedFilters scope="user-org" value={value} onApply={apply} />);
    fireEvent.change(screen.getByLabelText('필터 이름'), { target: { value: '신규 리드' } });
    fireEvent.click(screen.getByRole('button', { name: '현재 조건 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '신규 리드 적용' }));
    expect(apply).toHaveBeenCalledWith(value);
    fireEvent.click(screen.getByRole('button', { name: '신규 리드 삭제' }));
    expect(screen.queryByRole('button', { name: '신규 리드 적용' })).toBeNull();
  });
  it('다른 계정으로 변경하면 이전 목록을 표시하지 않는다', () => {
    const { rerender } = render(<SavedFilters scope="user-one" value={value} onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('필터 이름'), { target: { value: '내 조건' } });
    fireEvent.click(screen.getByRole('button', { name: '현재 조건 저장' }));
    rerender(<SavedFilters scope="user-two" value={value} onApply={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '내 조건 적용' })).toBeNull();
  });
  it('저장 실패를 성공으로 표시하지 않는다', () => {
    render(<SavedFilters scope="user-org" value={value} onApply={vi.fn()} />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
    fireEvent.change(screen.getByLabelText('필터 이름'), { target: { value: '조건' } });
    fireEvent.click(screen.getByRole('button', { name: '현재 조건 저장' }));
    expect(screen.getByRole('status').textContent).toContain('저장하지 못했습니다');
    expect(screen.queryByRole('button', { name: '조건 적용' })).toBeNull();
  });
});
