import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ResponsiveLeadManager from './ResponsiveLeadManager';
import type { Lead } from '../types';

afterEach(cleanup);
const lead: Lead = { id: 'fixture', bizName: 'Fixture lead', status: 'NEW', roadAddress: 'Fixture address' };

describe.each(['grid', 'list'] as const)('responsive %s selection', viewMode => {
  it.each(['{Enter}', ' '])('selects once with %s and keeps status changes independent', async key => {
    const select = vi.fn();
    const status = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ResponsiveLeadManager
      leads={[lead]} selectedLeads={new Set([lead.id])} onSelectLead={select}
      onUpdateStatus={status} onDeleteLead={vi.fn()} onAddLead={vi.fn()} onExportData={vi.fn()}
      searchQuery="" setSearchQuery={vi.fn()} statusFilter={[]} setStatusFilter={vi.fn()}
      viewMode={viewMode} setViewMode={vi.fn()} />);
    const selection = screen.getByRole('button', { name: `${lead.bizName} 선택` });
    expect(selection).toHaveAttribute('aria-pressed', 'true');
    selection.focus();
    await user.keyboard(key);
    expect(select).toHaveBeenCalledExactlyOnceWith(lead.id);
    select.mockClear();
    await user.selectOptions(screen.getByRole('combobox'), 'CONTACTED');
    expect(status).toHaveBeenCalledExactlyOnceWith(lead.id, 'CONTACTED');
    expect(select).not.toHaveBeenCalled();
    expect(container.querySelector('button button, button select')).toBeNull();
  });
});
