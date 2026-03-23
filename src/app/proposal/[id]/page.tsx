import React from 'react';
import { notFound } from 'next/navigation';
import { getProposalWithInventory } from '@/app/lead-manager/proposal-service';
import ProposalViewerClient from './ProposalViewerClient';
import { getSupabase } from '@/lib/supabase/utils';

export const metadata = {
  title: '광고 제안서 - Antigravity Geo-System',
  description: '고객 맞춤형 서울 지하철 광고 제안서',
};

export default async function ProposalPage({ params }: { params: { id: string } }) {
  // 제안서 정보 조회 (서버사이드)
  let result;
  try {
    result = await getProposalWithInventory(params.id);
  } catch (error) {
    console.error('Failed to load proposal:', error);
    result = null;
  }
  
  if (!result || !result.proposal) {
    notFound();
  }

  // 추가로 리드(고객) 정보 조회
  const supabase = getSupabase();
  const { data: lead } = await supabase
    .from('leads')
    .select('biz_name')
    .eq('id', result.proposal.leadId)
    .single();

  return (
    <div className="min-h-screen bg-[#0b0c10] py-10 px-4 flex items-center justify-center">
      <div className="w-full">
        <ProposalViewerClient 
          proposal={result.proposal} 
          inventory={result.inventory || []} 
          bizName={lead?.biz_name || '고객님'}
        />
      </div>
    </div>
  );
}
