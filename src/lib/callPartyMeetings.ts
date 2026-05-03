import { supabase } from "@/integrations/supabase/client";

export interface PendingMeeting {
  type_key: string;
  scheduled_at: string; // ISO
  location?: string | null;
  contact_name: string;
}

/**
 * Find a person by name in a workspace, or create a new one.
 */
export async function findOrCreatePerson(
  workspaceId: string,
  userId: string,
  fullName: string,
): Promise<string> {
  const trimmed = fullName.trim();
  const { data: existing } = await supabase
    .from("people")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("full_name", trimmed)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("people")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      full_name: trimmed,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Create a meeting from a Call Party call.
 * Returns the new meeting id.
 */
export async function createMeetingFromPending(
  workspaceId: string,
  userId: string,
  pending: PendingMeeting,
): Promise<string> {
  const personId = await findOrCreatePerson(
    workspaceId,
    userId,
    pending.contact_name,
  );
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      person_id: personId,
      type_key: pending.type_key,
      scheduled_at: pending.scheduled_at,
      location: pending.location ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
