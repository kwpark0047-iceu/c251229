-- 1. profiles 테이블 필드 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- 2. 가입 트리거 함수 업데이트 (등급별 승인 정책 반영)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_tier TEXT;
  should_approve BOOLEAN;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- 사용자가 가입 시 전달한 메타데이터에서 tier를 읽어옴 (기본값 'FREE')
  selected_tier := COALESCE(NEW.raw_user_meta_data->>'tier', 'FREE');
  
  -- 등급별 승인 기준 설정
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
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
