import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LineSelector from './LineSelector';
import { METRO_LINE_NAMES } from '@/app/shared/constants';

describe('LineSelector', () => {
    const mockOnLineChange = vi.fn();
    const mockPlanCounts = {
        '1': { station_layout: 1, psd: 0 },
        '2': { station_layout: 2, psd: 1 },
        '5': { station_layout: 0, psd: 0 },
        '7': { station_layout: 0, psd: 0 },
        '8': { station_layout: 0, psd: 0 },
    };

    it('renders all lines', () => {
        render(
            <LineSelector
                selectedLine="2"
                onLineChange={mockOnLineChange}
                planCounts={mockPlanCounts}
            />
        );

        // Check if 2호선 is rendered and selected (font-bold/white text check is tricky with classes, 
        // so we can check if it exists)
        expect(screen.getByText('2호선')).toBeInTheDocument();

        // Check other lines
        expect(screen.getByText('1호선')).toBeInTheDocument();
        expect(screen.getByText('5호선')).toBeInTheDocument();
    });

    it('calls onLineChange when a line is clicked', () => {
        render(
            <LineSelector
                selectedLine="2"
                onLineChange={mockOnLineChange}
                planCounts={mockPlanCounts}
            />
        );

        const button1 = screen.getByText('1호선').closest('button');
        fireEvent.click(button1!);

        expect(mockOnLineChange).toHaveBeenCalledWith('1');
    });

    it('displays correct counts', () => {
        render(
            <LineSelector
                selectedLine="2"
                onLineChange={mockOnLineChange}
                planCounts={mockPlanCounts}
            />
        );

        // 2호선: 2 + 1 = 3
        expect(screen.getByText('3')).toBeInTheDocument();
    });
});
