
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_party_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_party_events;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_party_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.call_party_events REPLICA IDENTITY FULL;
