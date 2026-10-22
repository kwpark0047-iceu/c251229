import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryTable from '@/app/lead-manager/components/inventory/InventoryTable';
import type { AdInventory } from '@/app/lead-manager/types';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';

vi.mock('@/app/lead-manager/inventory-service', () => ({
  getInventory: vi.fn().mockResolvedValue({ success: true, inventory: [], message: '' }),
  updateInventoryStatus: vi.fn().mockResolvedValue({ success: true, message: '' }),
  deleteInventory: vi.fn().mockResolvedValue({ success: true, message: '' }),
}));

const makeInventory = (overrides: Partial<AdInventory> = {}): AdInventory => ({
  id: 'inv-1',
  stationName: '강남역',
  locationCode: 'GC01',
  adType: 'poster',
  availabilityStatus: 'AVAILABLE',
  ...overrides,
});

const makeInventory2 = (overrides: Partial<AdInventory> = {}): AdInventory => ({
  id: 'inv-2',
  stationName: '홍대입구역',
  locationCode: 'GC02',
  adType: 'digital',
  availabilityStatus: 'AVAILABLE',
  ...overrides,
});

describe('InventoryTable RTL regression tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('@/app/lead-manager/inventory-service');
    const { getInventory, updateInventoryStatus, deleteInventory } = module;
    // Baseline mock resolutions with required message field
    vi.mocked(getInventory).mockResolvedValue({ success: true, inventory: [], message: '' });
    vi.mocked(updateInventoryStatus).mockResolvedValue({ success: true, message: '성공' });
    vi.mocked(deleteInventory).mockResolvedValue({ success: true, message: '성공' });
  });

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('status optimistic update with reload on failure', async () => {
    const module = await import('@/app/lead-manager/inventory-service');
    const { getInventory, updateInventoryStatus, deleteInventory } = module;
    const inventory = [makeInventory({ availabilityStatus: 'AVAILABLE' })];
    vi.mocked(getInventory).mockResolvedValue({ success: true, inventory, message: '' });
    vi.mocked(updateInventoryStatus).mockResolvedValueOnce({ success: false, message: '실패' });

    render(<InventoryTable />);
    await waitFor(() => expect(getInventory).toHaveBeenCalled());

    // Find the status select - removed the || fallback pattern
    const selectElement = screen.getByRole('combobox');

    // Select RESERVED option using userEvent.selectOptions
    await userEvent.selectOptions(selectElement, ['RESERVED']);

    // Should have attempted optimistic update
    await waitFor(() => expect(updateInventoryStatus).toHaveBeenCalled());

    // On failure, should reload
    await waitFor(() => expect(getInventory).toHaveBeenCalledTimes(2));
  });

  test('delete confirmation with optimistic deletion and rollback on failure', async () => {
    const module = await import('@/app/lead-manager/inventory-service');
    const { getInventory, updateInventoryStatus, deleteInventory } = module;
    const inventory = [
      makeInventory({ availabilityStatus: 'AVAILABLE' }),
      makeInventory2({ availabilityStatus: 'AVAILABLE' }),
    ];
    vi.mocked(getInventory).mockResolvedValue({ success: true, inventory, message: '' });
    vi.mocked(deleteInventory).mockResolvedValueOnce({ success: false, message: '실패' });

    render(<InventoryTable />);
    await waitFor(() => expect(getInventory).toHaveBeenCalled());

    // Click delete button - use within(dataRow).getByTitle('삭제') for row-scoped delete lookup
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    const rows = tbody ? tbody.querySelectorAll('tr') : [];
    const dataRow = rows[0];
    const deleteBtn = dataRow ? within(dataRow).getByTitle('삭제') : null;
    if (deleteBtn) {
      await userEvent.click(deleteBtn);
    }

    // Should have attempted delete
    await waitFor(() => expect(deleteInventory).toHaveBeenCalled());

    // On failure, inventory should be restored (component restores state without re-fetch)
    await waitFor(() => expect(getInventory).toHaveBeenCalledTimes(1));
  });

  test('empty inventory state', async () => {
    const module = await import('@/app/lead-manager/inventory-service');
    const { getInventory } = module;
    vi.mocked(getInventory).mockResolvedValue({ success: true, inventory: [], message: '' });

    render(<InventoryTable />);
    await waitFor(() => expect(getInventory).toHaveBeenCalled());

    // Should show empty state with upload button
    const emptyState = screen.getByText('등록된 광고매체가 없습니다');
    expect(emptyState).toBeInTheDocument();

    const uploadButton = screen.getByRole('button', {
      name: /신규 데이터 업로드/,
    });
    expect(uploadButton).toBeInTheDocument();
  });

  test('unknown ad-type fallback', async () => {
    const module = await import('@/app/lead-manager/inventory-service');
    const { getInventory } = module;
    const inventory = [makeInventory({ adType: 'unknown_type' })];
    vi.mocked(getInventory).mockResolvedValue({ success: true, inventory, message: '' });

    render(<InventoryTable />);
    await waitFor(() => expect(getInventory).toHaveBeenCalled());

    // Table should render with unknown ad type showing fallback
    const allRows = screen.getAllByRole('row');
    const dataRows = allRows.filter((row) => {
      const cells = row.querySelectorAll('td');
      return cells.length === 5;
    });
    expect(dataRows.length).toBe(1);

    const adTypeCell = dataRows[0].querySelectorAll('td')[2];
    expect(adTypeCell).toBeInTheDocument();
    // Should display the raw adType as fallback when not in AD_TYPE_LABELS
    expect(adTypeCell.textContent).toContain('unknown_type');
  });
});
