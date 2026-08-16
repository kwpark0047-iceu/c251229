-- 20260815120000_fix_handle_new_user_search_path.sql
-- GoTrue 가입 500 오류 수정
--
-- 원인: handle_new_user 트리거가 encode(gen_random_bytes(6), 'hex')를 호출하는데,
--       pgcrypto가 extensions 스키마에 설치되어 있음. 함수에 SET search_path가 없어
--       호출자(GoTrue의 supabase_auth_admin, search_path=auth,...)의 스키마 경로를
--       상속 → gen_random_bytes 함수를 찾지 못해 SQLSTATE 42883 발생 →
--       GoTrue가 users+트리거 트랜잭션 전체를 롤백 → 500 'Database error saving new user'.
--
-- 수정: SECURITY DEFINER 함수에 SET search_path = public, extensions 추가하여
--       어떤 역할이 호출하든 public 스키마 함수와 extensions 함수를 찾도록 보장.
--       본문은 기존 로직과 동일 (트리거는 함수와 동일 이름이라 그대로 유지됨).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;
