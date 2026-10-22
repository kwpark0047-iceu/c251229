import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdPositionDetailModal from './AdPositionDetailModal';
import BatchDownloadModal from './BatchDownloadModal';
import FloorPlanUploadModal from './FloorPlanUploadModal';
import FloorPlanViewer from './FloorPlanViewer';
import OptimizedFloorPlanViewer from './OptimizedFloorPlanViewer';
import type { FloorPlan, AdPosition } from '../types';

vi.mock('../storage-service', () => ({
  downloadFloorPlansAsZip: vi.fn(),
  downloadFloorPlanImage: vi.fn(),
}));

const plan: FloorPlan = { id: 'plan', stationName: 'Test', lineNumber: '2', planType: 'station_layout', floorName: 'B1', imageUrl: '/plan.png', sortOrder: 0 };
const marker: AdPosition = { id: 'marker', floorPlanId: 'plan', positionX: 50, positionY: 50, markerColor: '#fff', markerSize: 24, label: 'Marker A' };
afterEach(cleanup);

describe('scoped floor plan accessibility', () => {
  it('closes the download backdrop with Enter and Space, not content clicks', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<BatchDownloadModal isOpen onClose={close} plans={[plan]} selectedIds={[]} onToggleSelect={vi.fn()} onSelectAll={vi.fn()} onDeselectAll={vi.fn()} />);
    fireEvent.click(screen.getByText('도면 다운로드'));
    expect(close).not.toHaveBeenCalled();
    const backdrop = screen.getByRole('button', { name: '다운로드 모달 닫기' });
    expect(backdrop.tagName).toBe('BUTTON');
    backdrop.focus();
    await user.keyboard('{Enter} ');
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('gives detail close actions accessible names without making the content clickable', () => {
    const close = vi.fn();
    render(<AdPositionDetailModal isOpen onClose={close} position={marker} />);
    fireEvent.click(screen.getByText('상세 정보가 없습니다'));
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '상세 모달 닫기' }));
    expect(close).toHaveBeenCalledOnce();
  });

  it('associates upload labels and provides a focusable native file input for selection and drop', () => {
    render(<FloorPlanUploadModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('노선', { exact: true }).tagName).toBe('SELECT');
    expect(screen.getByLabelText('도면 유형', { exact: true }).tagName).toBe('SELECT');
    const input = screen.getByLabelText('파일 업로드') as HTMLInputElement;
    expect(input).not.toHaveClass('hidden');
    input.focus();
    expect(input).toHaveFocus();
    const file = new File(['image'], 'selected.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('selected.png')).toBeInTheDocument();
    fireEvent.drop(input, { dataTransfer: { files: [new File(['drop'], 'dropped.png', { type: 'image/png' })] } });
    expect(screen.getByText('dropped.png')).toBeInTheDocument();
  });

  it('keeps wheel zoom and drag off toolbar and editing uses a native sibling action', async () => {
    const user = userEvent.setup();
    const add = vi.fn();
    const { container, rerender } = render(<FloorPlanViewer plan={null} />);
    rerender(<FloorPlanViewer plan={plan} isEditing onAddPosition={add} adPositions={[marker]} />);
    const action = screen.getByRole('button', { name: '광고 위치 추가' });
    expect(action.tagName).toBe('BUTTON');
    expect(container.querySelector('button button')).toBeNull();
    action.focus();
    await user.keyboard('{Enter} ');
    expect(add).toHaveBeenNthCalledWith(1, 50, 50);
    expect(add).toHaveBeenNthCalledWith(2, 50, 50);
    const viewport = action.closest('[data-floor-plan-viewport]')!;
    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(screen.getByText('110%')).toBeInTheDocument();
    fireEvent.wheel(screen.getByRole('button', { name: '확대 (+)' }), { deltaY: -100 });
    expect(screen.getByText('110%')).toBeInTheDocument();
    fireEvent.mouseDown(viewport, { button: 0, clientX: 10, clientY: 20 });
    fireEvent.mouseMove(viewport, { clientX: 40, clientY: 60 });
    fireEvent.mouseUp(viewport);
    expect(container.querySelector('[style*="translate(30px, 40px)"]')).not.toBeNull();
  });

  it('provides keyboard alternatives for canvas markers without nesting controls', async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    const { container } = render(<OptimizedFloorPlanViewer plan={plan} adPositions={[marker]} onPositionClick={select} />);
    const action = screen.getByRole('button', { name: 'Marker A' });
    expect(action.tagName).toBe('BUTTON');
    action.focus();
    await user.keyboard('{Enter} ');
    expect(select).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenLastCalledWith(marker);
    expect(container.querySelector('button button')).toBeNull();
  });
});
