-- 20260326_automate_org_creation.sql
-- 회원가입 시 조직 및 멤버십 자동 생성 트리거 고도화

-- 1. 가입 트리거 함수 업데이트 (조직 자동 생성 포함)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_tier TEXT;
  should_approve BOOLEAN;
  expiry_date TIMESTAMPTZ;
  new_org_id UUID;
  org_name TEXT;
  new_invite_code TEXT;
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

  -- 3) 자동 조직 생성 (초대 코드로 가입한 경우가 아니고, 이미 멤버십이 없는 경우)
  -- 만약 클라이언트에서 invite_code를 전달했다면, 그건 나중에 join 로직에서 처리되거나 
  -- 여기서는 순수 신규 가입(새 조직 생성) 케이스만 다룸
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = NEW.id) 
     AND (NEW.raw_user_meta_data->>'invite_code') IS NULL THEN
     
    -- 조직명 결정 (사용자 이름을 따거나 이메일 앞부분 사용)
    org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1) || '의 조직');
    
    -- 새 조직 삽입 (초대 코드는 랜덤 생성)
    new_invite_code := encode(gen_random_bytes(6), 'hex');
    INSERT INTO public.organizations (name, invite_code)
    VALUES (org_name, new_invite_code)
    RETURNING id INTO new_org_id;

    -- 사용자 조직 멤버십(Owner) 추가
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거가 이미 연결되어 있는지 확인 (기존 migrations에서 이미 함)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
