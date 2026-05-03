import { useMemo } from "react";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import type { MeetingType } from "@/types/workspace";

export function useMeetingTypes() {
  const { config } = useWorkspaceContext();
  const meetingTypes = config?.meetingTypes ?? [];
  const followUpRules = config?.followUpRules ?? {};

  const byKey = useMemo(() => {
    const map = new Map<string, MeetingType>();
    for (const t of meetingTypes) map.set(t.key, t);
    return map;
  }, [meetingTypes]);

  const getMeetingType = (key: string) => byKey.get(key);

  const getFollowUpsFor = (
    key: string,
    track: "client_track" | "recruitment_track",
  ): MeetingType[] => {
    const rule = followUpRules[key];
    const keys = rule?.[track] ?? [];
    return keys.map((k) => byKey.get(k)).filter(Boolean) as MeetingType[];
  };

  return {
    meetingTypes,
    followUpRules,
    getMeetingType,
    getFollowUpsFor,
  };
}
