import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SettingsModal from './SettingsModal';
import DuplicateManager from './DuplicateManager';
import CallLogModal from './crm/CallLogModal';
import SopoLookupModal from './crm/SopoLookupModal';
import InventoryUploadModal from './inventory/InventoryUploadModal';
import TaskFormModal from './schedule/TaskFormModal';
import { NotificationProvider } from '@/context/NotificationContext';
import { uploadInventoryExcel } from '../inventory-service';
import { logCall } from '../crm-service';
import { createTask } from '../task-service';
import type { Lead } from '../types';

vi.mock('../auth-service', () => ({ getUserRole: vi.fn().mockResolvedValue('admin') }));
vi.mock('../supabase-service', () => ({
  getLeads: vi.fn().mockResolvedValue({ success: true, leads: [] }),
  deleteDuplicateLeadsFromDB: vi.fn(),
}));
vi.mock('../crm-service', () => ({ logCall: vi.fn() }));
vi.mock('../task-service', () => ({ createTask: vi.fn(), updateTask: vi.fn() }));
vi.mock('../inventory-service', () => ({ uploadInventoryExcel: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const lead: Lead = { id: 'one', bizName: 'Test shop', roadAddress: 'Test road', status: 'NEW' };
const settings = { apiKey: '', corsProxy: '', searchType: 'license_date' as const, regionCode: '6110000' };
const modals = {
  settings: (close: () => void) => <SettingsModal settings={settings} onSave={vi.fn()} onClose={close} />,
  call: (close: () => void) => <CallLogModal leadId="one" leadName="Test" onSuccess={vi.fn()} onClose={close} />,
  sopo: (close: () => void) => <NotificationProvider><SopoLookupModal lead={lead} onSave={vi.fn()} onClose={close} /></NotificationProvider>,
  upload: (close: () => void) => <InventoryUploadModal onSuccess={vi.fn()} onClose={close} />,
  task: (close: () => void) => <TaskFormModal onSave={vi.fn()} onClose={close} />,
};

describe('scoped modal accessibility', () => {
  for (const [name, modal] of Object.entries(modals)) {
    it.each(['{Enter}', ' '])(`${name} backdrop is a native keyboard action (%s)`, async (key) => {
      const user = userEvent.setup();
      const close = vi.fn();
      const { container } = render(modal(close));
      const backdrop = screen.getByRole('button', { name: '배경 닫기' });
      expect(backdrop.tagName).toBe('BUTTON');
      expect(backdrop.tabIndex).toBe(0);
      expect(container.querySelector('button button, button input')).toBeNull();
      backdrop.focus();
      await user.keyboard(key);
      expect(close).toHaveBeenCalledTimes(1);
    });
  }

  it('associates visible settings labels and preserves save', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<SettingsModal settings={settings} onSave={save} onClose={vi.fn()} />);
    expect(screen.getByLabelText('CORS 프록시 설정').tagName).toBe('SELECT');
    expect(screen.getByLabelText('기본 동기화 지역').tagName).toBe('SELECT');
    await user.click(screen.getByRole('button', { name: 'API 키 Vault' }));
    await user.type(screen.getByLabelText('서울시 열린데이터 광장 키'), 'test-key');
    await user.click(screen.getByRole('button', { name: '설정 저장' }));
    expect(save).toHaveBeenCalledWith({ ...settings, apiKey: JSON.stringify({ localdata: '', seoul: 'test-key', kric: '', resend: '' }) });
  });

  it('associates every visible call field label', () => {
    render(modals.call(vi.fn()));
    for (const label of ['통화 시간 (분)', '담당자명', '통화 메모', '다음 액션', '다음 연락 예정일']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('preserves call values and submission callbacks', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const success = vi.fn();
    vi.mocked(logCall).mockResolvedValue({ success: true, message: 'Saved' });
    render(<CallLogModal leadId="one" leadName="Test" onClose={close} onSuccess={success} />);
    await user.type(screen.getByLabelText('통화 시간 (분)'), '5');
    await user.type(screen.getByLabelText('담당자명'), 'Test contact');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(logCall).toHaveBeenCalledWith('one', 'NO_ANSWER', expect.objectContaining({ durationSeconds: 300, contactPerson: 'Test contact' }));
    expect(success).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('associates task labels without changing defaults', () => {
    render(<TaskFormModal defaultDate="2026-10-19" onSave={vi.fn()} onClose={vi.fn()} />);
    for (const label of [/제목/, '설명', '담당자', '연결 리드', '메모']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/날짜/)).toHaveValue('2026-10-19');
  });

  it('preserves task creation data', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(<TaskFormModal defaultDate="2026-10-19" onSave={save} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(/제목/), 'Test task');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test task', dueDate: '2026-10-19', taskType: 'CALL', priority: 'MEDIUM' }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('selects duplicate groups with native keyboard and checkbox actions', async () => {
    const user = userEvent.setup();
    render(<DuplicateManager leads={[lead, { ...lead, id: 'two' }]} />);
    const toggle = await screen.findByRole('button', { name: /그룹 1 선택/ });
    expect(toggle.tagName).toBe('BUTTON');
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(toggle.querySelector('input, button')).toBeNull();
  });

  it('uses a native full-area file input, supports drop and same-file reselection', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadInventoryExcel).mockResolvedValue({ success: false, fileName: 'inventory.csv', rowCount: 1, successCount: 0, errorCount: 1, errors: [] });
    render(modals.upload(vi.fn()));
    const input = screen.getByLabelText('인벤토리 엑셀 템플릿 업로드');
    expect(input).not.toHaveClass('hidden');
    expect(input).toHaveClass('absolute', 'inset-0', 'opacity-0');
    const file = new File(['a'], 'inventory.csv', { type: 'text/csv' });
    await user.upload(input, file);
    expect(input).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '서버로 엑셀 파일 업로드 시작' }));
    expect(await screen.findByText('업로드 실패')).toBeInTheDocument();
    await user.upload(input, file);
    expect(screen.queryByText('업로드 실패')).not.toBeInTheDocument();
    const dropped = new File(['b'], 'dropped.xlsx');
    fireEvent.drop(input, { dataTransfer: { files: [dropped] } });
    expect(screen.getByText('dropped.xlsx')).toBeInTheDocument();
    expect(screen.getByLabelText('사용 가능일 (available_from)')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('계약 만료일 (available_to)')).toHaveAttribute('type', 'date');
  });
});
