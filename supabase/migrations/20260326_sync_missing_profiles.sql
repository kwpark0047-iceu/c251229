-- 20260326_sync_missing_profiles.sql
-- Auth 계정과 Profiles 테이블 간의 불일치(누락된 사용자) 복구 스크립트

DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
    new_invite_code TEXT;
BEGIN
    -- 1. Profiles 테이블 누락 사용자 복구
    INSERT INTO public.profiles (id, email, full_name, is_approved, tier, created_at)
    SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
        CASE WHEN email = 'kwpark0047@gmail.com' THEN TRUE ELSE FALSE END,
        COALESCE(raw_user_meta_data->>'tier', 'FREE'),
        created_at
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
    ON CONFLICT (id) DO NOTHING;

    -- 2. 조직 및 멤버십 누락 사용자 복구
    FOR user_record IN 
        SELECT p.id, p.email, p.fullName 
        FROM public.profiles p
        WHERE p.id NOT IN (SELECT user_id FROM public.organization_members)
    LOOP
        -- 새 조직 생성
        new_invite_code := encode(gen_random_bytes(6), 'hex');
        INSERT INTO public.organizations (name, invite_code)
        VALUES (split_part(user_record.email, '@', 1) || '의 조직', new_invite_code)
        RETURNING id INTO new_org_id;

        -- 멤버십(Owner) 연결
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, user_record.id, 'owner');
        
        RAISE NOTICE 'User % (Email: %) has been synced with a new organization.', user_record.id, user_record.email;
    END LOOP;
END $$;
