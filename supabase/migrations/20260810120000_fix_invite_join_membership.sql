-- 20260810120000_fix_invite_join_membership.sql
-- 조직 초대 코드 가입 시 멤버십 저장 버그 수정
--
-- 원인: handleJoinOrg이 signUp 메타데이터에 invite_code를 전달하지 않아
-- handle_new_user 트리거가 초대받은 조직 대신 '새 조직 자동 생성 + owner 멤버십'을
-- 만들어버림. 이후 클라이언트의 organization_members INSERT는 이메일 확인 전
-- 세션 부재로 RLS 차단되어 멤버십 저장 실패 → 동기화 인증 가드(requireSyncAuth) 403
-- '소속 조직이 없습니다' 지속 발생.
--
-- 수정: invite_code가 메타데이터에 있으면 해당 조직의 member로 가입시키고,
-- 신규 조직은 생성하지 않는다. (초대 코드가 유효하지 않으면 기존처럼 새 조직 생성)

-- 1. 가입 트리거 함수 재작성 (invite_code 가입 분기 추가)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_tier TEXT;
  should_approve BOOLEAN;
  expiry_date TIMESTAMPTZ;
  new_org_id UUID;
  org_name TEXT;
  new_invite_code TEXT;
  invite_code_meta TEXT;
  invited_org_id UUID;
BEGIN
  -- 1) 등급 및 승인 정책 설정
  -- 메타데이터에서 tier를 읽어오고 기본값은 'FREE'
  selected_tier := COALESCE(NEW.raw_user_meta_data->>'tier', 'FREE');
  
  -- FREE, DEMO는 즉시 승인 / MEDIA, SALES는 관리자 승인 대기
  IF selected_tier IN ('FREE', 'DEMO') THEN
    should_approve := TRUE;
  ELSE
    should_approve := FALSE;
  END IF;

  -- 데모 등급인 경우 만료일(7일) 설정
  IF selected_tier = 'DEMO' THEN
    expiry_date := NOW() + INTERVAL '7 days';
  ELSE
    expiry_date := NULL;
  END IF;

  -- 특정 관리자 계정은 무조건 승인 및 슈퍼 어드민 부여
  IF NEW.email = 'kwpark0047@gmail.com' THEN
    should_approve := TRUE;
  END IF;

  -- 2) 프로필 생성 또는 업데이트
  INSERT INTO public.profiles (id, email, full_name, is_approved, is_super_admin, tier, trial_expires_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    should_approve,
    CASE WHEN NEW.email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END,
    selected_tier,
    expiry_date
  )
  ON CONFLICT (id) DO UPDATE SET
    tier = EXCLUDED.tier,
    trial_expires_at = EXCLUDED.trial_expires_at,
    is_approved = EXCLUDED.is_approved;

  -- 3) 조직 소속 처리
  -- 이미 멤버십이 있으면 아무것도 하지 않는다 (중복 가입 방지)
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) THEN
    invite_code_meta := NEW.raw_user_meta_data->>'invite_code';

    -- 3-a) 초대 코드로 가입한 경우: 해당 조직의 member로 소속
    IF invite_code_meta IS NOT NULL AND invite_code_meta <> '' THEN
      SELECT id INTO invited_org_id
      FROM public.organizations
      WHERE invite_code = invite_code_meta
      LIMIT 1;

      IF invited_org_id IS NOT NULL THEN
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (invited_org_id, NEW.id, 'member');
      ELSE
        -- 초대 코드가 유효하지 않으면 기존처럼 새 조직 자동 생성 (가입 자체는 실패하지 않음)
        org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1) || '의 조직');
        new_invite_code := encode(gen_random_bytes(6), 'hex');
        INSERT INTO public.organizations (name, invite_code)
        VALUES (org_name, new_invite_code)
        RETURNING id INTO new_org_id;

        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'owner');
      END IF;
    ELSE
      -- 3-b) 일반 신규 가입: 새 조직 자동 생성 + owner 멤버십
      org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1) || '의 조직');
      new_invite_code := encode(gen_random_bytes(6), 'hex');
      INSERT INTO public.organizations (name, invite_code)
      VALUES (org_name, new_invite_code)
      RETURNING id INTO new_org_id;

      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (new_org_id, NEW.id, 'owner');
    END IF;
  END IF;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 오가입 사용자 보정
-- 이전 버그(2026-08-10 이전, invite_code 미전달)로 초대 조직 대신
-- '자동 생성 조직(owner)'에 소속된 사용자를 초대 조직(member)으로 재배정한다.
--
-- 대상: raw_user_meta_data->>'invite_code'가 유효한 조직을 가리키는데
--       그 조직의 member가 아닌 사용자.
-- 동작: 자동생성된 조직의 owner 멤버십 삭제 → 초대 조직 member 멤버십 생성.
--       (초대 조직 멤버십이 이미 있으면 ON CONFLICT DO NOTHING로 중복 방지)
DO $$
DECLARE
  u RECORD;
  target_org_id UUID;
BEGIN
  FOR u IN
    SELECT id, raw_user_meta_data
    FROM auth.users
    WHERE raw_user_meta_data->>'invite_code' IS NOT NULL
      AND raw_user_meta_data->>'invite_code' <> ''
  LOOP
    SELECT id INTO target_org_id
    FROM public.organizations
    WHERE invite_code = u.raw_user_meta_data->>'invite_code'
    LIMIT 1;

    IF target_org_id IS NOT NULL THEN
      -- 이미 초대 조직 멤버십이 있는 경우: 자동생성 조직만 정리
      IF NOT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = u.id AND organization_id = target_org_id
      ) THEN
        -- 자동생성 조직 멤버십 삭제 (초대 조직이 아닌 멤버십 전부)
        DELETE FROM public.organization_members
        WHERE user_id = u.id AND organization_id <> target_org_id;

        -- 초대 조직 member 멤버십 생성
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (target_org_id, u.id, 'member')
        ON CONFLICT (organization_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;