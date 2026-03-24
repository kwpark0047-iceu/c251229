import { NextRequest, NextResponse } from 'next/server';
import { getFloorPlansByLine, getAllFloorPlans } from '@/app/floor-plans/floor-plan-service';
import { uploadFloorPlanImage } from '@/app/floor-plans/storage-service';
import { MetroLine, PlanType } from '@/app/floor-plans/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const line = searchParams.get('line') as MetroLine | null;

  try {
    const plans = line 
      ? await getFloorPlansByLine(line)
      : await getAllFloorPlans();
      
    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('API Error (GET /api/floor-plans):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error('Failed to parse form data:', e);
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const lineNumber = formData.get('line') as MetroLine;
    const stationName = formData.get('station') as string;
    const planType = (formData.get('planType') as PlanType) || 'station_layout';
    const sortOrderRaw = formData.get('sortOrder') as string;
    const sortOrder = parseInt(sortOrderRaw || '0', 10);

    if (!file || !lineNumber || !stationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await uploadFloorPlanImage(
      file,
      lineNumber,
      planType,
      stationName,
      sortOrder
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      floorPlanId: result.floorPlan?.id || 'mock-id',
      storagePath: result.storagePath,
      publicUrl: result.publicUrl
    });
  } catch (error) {
    console.error('API Error (POST /api/floor-plans):', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
