import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/app/api/sync-utils';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const authError = await requireUser(supabase);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const stationName = searchParams.get('stationName');

  if (!stationName) {
    return NextResponse.json({ success: false, error: 'stationName is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('ad_inventory')
      .select('*')
      .eq('station_name', stationName);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, inventory: data });
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
