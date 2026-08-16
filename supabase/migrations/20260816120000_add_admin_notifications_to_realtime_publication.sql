-- admin_notifications 테이블을 Supabase Realtime publication에 추가
-- postgres_changes INSERT 이벤트가 발생하도록 하여 관리자 실시간 알림(토스트/알림센터)이 동작하게 함
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
