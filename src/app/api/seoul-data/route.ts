import { NextRequest, NextResponse } from 'next/server';
import { 
  getSeoulClinicLicenseData, 
  getSeoulHospitalLicenseData,
  getSeoulQuasiMedicalLicenseData,
  getSeoulFitnessLicenseData,
  getRealtimeArrival,
  getSeoulStationsByLine
} from '@/lib/seoul-data-api';

/** API Route */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const service = searchParams.get('service');
  const startIndex = parseInt(searchParams.get('start') || '1');
  const endIndex = parseInt(searchParams.get('end') || '100');
  const query = searchParams.get('query') || '';
  
  // ?대씪?댁뼵?멸? ?꾨떖??而ㅼ뒪?� API ???뚯떛
  const customApiKey = request.headers.get('x-api-key') || searchParams.get('apiKey') || undefined;

  if (!service) {
    return NextResponse.json({ success: false, error: 'Service ID is required' }, { status: 400 });
  }

  try {
    let result: any = null;

    switch (service) {
      case 'clinic':
        result = await getSeoulClinicLicenseData(startIndex, endIndex, customApiKey);
        break;
      case 'hospital':
        result = await getSeoulHospitalLicenseData(startIndex, endIndex, customApiKey);
        break;
      case 'quasi-medical':
        result = await getSeoulQuasiMedicalLicenseData(startIndex, endIndex, customApiKey);
        break;
      case 'fitness':
        result = await getSeoulFitnessLicenseData(startIndex, endIndex, customApiKey);
        break;
      case 'arrival':
        if (!query) return NextResponse.json({ success: false, error: 'Station name is required' }, { status: 400 });
        const arrivals = await getRealtimeArrival(query, customApiKey);
        result = { success: true, data: arrivals };
        break;
      case 'stations':
        if (!query) return NextResponse.json({ success: false, error: 'Line name is required' }, { status: 400 });
        const stations = await getSeoulStationsByLine(query, customApiKey);
        result = { success: true, data: stations };
        break;
      default:
        return NextResponse.json({ success: false, error: 'Unsupported service' }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ success: false, error: 'Failed to fetch data from Seoul API' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('[Seoul Data API Route] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
