/**
 * Shared Types
 */

export type MetroLine = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'S' | 'K' | 'A' | 'B' | 'G' | 'I' | 'U' | 'W';

export type PlanType = 'station_layout' | 'psd';

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
    'station_layout': '역구내도면',
    'psd': 'PSD도면',
};

// Comprehensive FloorPlan interface
export interface FloorPlan {
    id: string;
    stationName: string;
    lineNumber?: MetroLine; // Optional to accommodate legacy/partial data
    planType?: PlanType;    // Optional
    floorName: string;
    imageUrl: string;
    thumbnailUrl?: string;
    storagePath?: string;
    fileName?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    sortOrder?: number;
    createdAt?: string;
    updatedAt?: string;
}
