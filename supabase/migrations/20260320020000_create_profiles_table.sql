-- =====================================================
-- 사용자 프로필 및 슈퍼 어드민 권한 테이블
-- =====================================================

-- 1. profiles 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. RLS 정책 설정
-- 자신의 프로필은 모든 사용자 조회 가능
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 슈퍼 어드민은 모든 프로필 조회/수정 가능 (순환 참조 방지를 위해 이메일 직접 체크 또는 role 체크)
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
    )
  );

-- 3. 신규 가입 시 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, is_super_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    -- 특정 이메일은 자동 승인 및 슈퍼 어드민 부여
    CASE WHEN NEW.email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END,
    CASE WHEN NEW.email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 기존 사용자들을 위한 프로필 일괄 생성 및 슈퍼 어드민 설정
INSERT INTO public.profiles (id, email, full_name, is_approved, is_super_admin)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name',
  CASE WHEN email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END,
  CASE WHEN email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  is_super_admin = CASE WHEN public.profiles.email = 'kwpark0047@gmail.com' THEN TRUE ELSE public.profiles.is_super_admin END,
  is_approved = CASE WHEN public.profiles.email = 'kwpark0047@gmail.com' THEN TRUE ELSE public.profiles.is_approved END;

-- 5. 슈퍼 어드민 전용 조직/멤버십 관리 정책 추가
-- organization_members 테이블에 슈퍼 어드민 예외 규칙 적용
DROP POLICY IF EXISTS "Super admins can manage all organization_members" ON organization_members;
CREATE POLICY "Super admins can manage all organization_members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
    )
  );
