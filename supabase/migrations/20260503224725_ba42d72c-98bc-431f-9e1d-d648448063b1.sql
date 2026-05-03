
ALTER TABLE public.call_party_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_party_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- call_party_sessions
CREATE POLICY "Members view workspace sessions" ON public.call_party_sessions
  FOR SELECT USING (workspace_id = get_user_workspace(auth.uid()));
CREATE POLICY "Members insert own sessions" ON public.call_party_sessions
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Members update own sessions" ON public.call_party_sessions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members delete own sessions" ON public.call_party_sessions
  FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Legatus admins manage sessions" ON public.call_party_sessions
  FOR ALL USING (is_legatus_admin(auth.uid())) WITH CHECK (is_legatus_admin(auth.uid()));

-- call_party_events
CREATE POLICY "Members view workspace events" ON public.call_party_events
  FOR SELECT USING (workspace_id = get_user_workspace(auth.uid()));
CREATE POLICY "Members insert events as organizer" ON public.call_party_events
  FOR INSERT WITH CHECK (workspace_id = get_user_workspace(auth.uid()) AND organizer_id = auth.uid());
CREATE POLICY "Members update own events" ON public.call_party_events
  FOR UPDATE USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Members delete own events" ON public.call_party_events
  FOR DELETE USING (organizer_id = auth.uid());
CREATE POLICY "Legatus admins manage events" ON public.call_party_events
  FOR ALL USING (is_legatus_admin(auth.uid())) WITH CHECK (is_legatus_admin(auth.uid()));

-- calls
CREATE POLICY "Members view workspace calls" ON public.calls
  FOR SELECT USING (workspace_id = get_user_workspace(auth.uid()));
CREATE POLICY "Members insert calls in own session" ON public.calls
  FOR INSERT WITH CHECK (
    workspace_id = get_user_workspace(auth.uid())
    AND EXISTS (SELECT 1 FROM public.call_party_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Members update own session calls" ON public.calls
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.call_party_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Members delete own session calls" ON public.calls
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.call_party_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Legatus admins manage calls" ON public.calls
  FOR ALL USING (is_legatus_admin(auth.uid())) WITH CHECK (is_legatus_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_calls_workspace_normalized ON public.calls (workspace_id, contact_name_normalized);
CREATE INDEX IF NOT EXISTS idx_calls_session ON public.calls (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON public.call_party_sessions (user_id, status);
