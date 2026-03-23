import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadProposalFile } from './proposal-service';
import * as authService from './auth-service';
import * as supabaseClient from '@/lib/supabase/client';

// 모킹 설정
vi.mock('./auth-service', () => ({
  getOrganizationId: vi.fn(),
  logActivity: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('proposal-service: 외부 파일 업로드 테스트', () => {
  const mockFile = new File(['test content'], 'test-proposal.pdf', { type: 'application/pdf' });
  const mockLeadId = 'lead-123';
  const mockOrgId = 'org-456';
  const mockTitle = '테스트 제안서';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조직 ID가 없으면 업로드에 실패해야 한다', async () => {
    vi.mocked(authService.getOrganizationId).mockResolvedValue(null);

    const result = await uploadProposalFile(mockFile, mockLeadId, mockTitle);

    expect(result.success).toBe(false);
    expect(result.message).toContain('매체사 권한이 필요합니다');
  });

  it('파일 업로드 및 DB 저장이 성공하면 성공 결과를 반환해야 한다', async () => {
    vi.mocked(authService.getOrganizationId).mockResolvedValue(mockOrgId);

    const mockInsertData = {
      id: 'prop-789',
      lead_id: mockLeadId,
      title: mockTitle,
      pdf_url: 'https://supabase.com/storage/test.pdf',
      is_external: true,
      original_filename: 'test-proposal.pdf',
      file_type: 'pdf',
      organization_id: mockOrgId,
      status: 'SENT',
    };

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockInsertData.pdf_url } }),
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInsertData, error: null }),
    };

    vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabase as any);

    const result = await uploadProposalFile(mockFile, mockLeadId, mockTitle);

    expect(result.success).toBe(true);
    expect(result.proposal?.isExternal).toBe(true);
    expect(result.proposal?.originalFilename).toBe('test-proposal.pdf');
    expect(mockSupabase.storage.upload).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('proposals');
    expect(mockSupabase.from).toHaveBeenCalledWith('leads'); // 리드 상태 업데이트 확인
  });

  it('Storage 업로드 에러 시 실패를 반환해야 한다', async () => {
    vi.mocked(authService.getOrganizationId).mockResolvedValue(mockOrgId);

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } }),
      },
    };

    vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabase as any);

    const result = await uploadProposalFile(mockFile, mockLeadId, mockTitle);

    expect(result.success).toBe(false);
    expect(result.message).toContain('파일 업로드 실패');
  });

  it('DB 저장 에러 시 실패를 반환해야 한다', async () => {
    vi.mocked(authService.getOrganizationId).mockResolvedValue(mockOrgId);

    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ data: { path: 'path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'url' } }),
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
    };

    vi.mocked(supabaseClient.createClient).mockReturnValue(mockSupabase as any);

    const result = await uploadProposalFile(mockFile, mockLeadId, mockTitle);

    expect(result.success).toBe(false);
    expect(result.message).toContain('DB Error');
  });
});
