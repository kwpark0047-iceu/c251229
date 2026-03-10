
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StationFloorPlans from './StationFloorPlans';
import { FloorPlan } from '../../types';

// Mock Lucide Icon
vi.mock('lucide-react', () => ({
    X: () => <span data-testid="close-icon">X</span>
}));

const mockFloorPlans: FloorPlan[] = [
    {
        id: 'fp-1',
        stationName: 'Gangnam',
        floorName: 'B1',
        imageUrl: 'http://example.com/b1.jpg',
        thumbnailUrl: 'http://example.com/b1-thumb.jpg',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
    },
    {
        id: 'fp-2',
        stationName: 'Gangnam',
        floorName: 'B2',
        imageUrl: 'http://example.com/b2.jpg',
        thumbnailUrl: 'http://example.com/b2-thumb.jpg',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
    }
];

describe('StationFloorPlans', () => {
    it('should not render anything if floorPlans is empty', () => {
        const { container } = render(<StationFloorPlans floorPlans={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render floor plan thumbnails', () => {
        render(<StationFloorPlans floorPlans={mockFloorPlans} />);

        expect(screen.getByText('역사 도면 (2)')).toBeInTheDocument();
        expect(screen.getByAltText('Gangnam B1')).toBeInTheDocument();
        expect(screen.getByAltText('Gangnam B2')).toBeInTheDocument();
        expect(screen.getByText('B1')).toBeInTheDocument();
        expect(screen.getByText('B2')).toBeInTheDocument();
    });

    it('should open modal when a thumbnail is clicked', () => {
        render(<StationFloorPlans floorPlans={mockFloorPlans} />);

        const thumbnail = screen.getByLabelText('Gangnam B1 도면');
        fireEvent.click(thumbnail);

        // Modal should appear
        expect(screen.getByText('Gangnam B1')).toBeInTheDocument();
        expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
        render(<StationFloorPlans floorPlans={mockFloorPlans} />);

        // Open modal
        fireEvent.click(screen.getByLabelText('Gangnam B1 도면'));
        expect(screen.getByTestId('close-icon')).toBeInTheDocument();

        // Close modal
        fireEvent.click(screen.getByTestId('close-icon').parentElement!);

        expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument();
    });
});
