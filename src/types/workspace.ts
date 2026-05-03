// Centralized type definitions for the Workspace configuration.
// All modules consume these types via WorkspaceContext.

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "enterprise";
  owner_user_id: string | null;
  status: "active" | "frozen" | "cancelled";
  frozen_at: string | null;
  created_at: string;
}

export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  key: string;
  label: string;
  level: number;
  permissions: Record<string, unknown>;
}

export interface ProductionUnit {
  id: string;
  workspace_id: string;
  key: string;
  label: string;
  description: string | null;
  value_multiplier: number;
}

export interface MeetingResultField {
  key: string;
  label: string;
  type: "number" | "boolean" | "text";
  unit?: string;
}

export interface MeetingType {
  key: string;
  label: string;
  color: string;
  track: "client" | "recruitment" | string;
  result_fields: MeetingResultField[];
}

export type FollowUpRules = Record<
  string,
  Partial<Record<"client_track" | "recruitment_track", string[]>>
>;

export interface Metric {
  key: string;
  label: string;
  type: "automatic" | "manual" | "external";
  source_module?: string;
  source_field?: string;
  input_frequency?: "daily" | "weekly" | "monthly";
}

export interface ModuleConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export type ModulesConfig = Record<string, ModuleConfig>;

export interface PromotionConfig {
  mode?: "notify_only" | "requires_approval" | "automatic";
  criteria?: Array<{
    metric_key: string;
    threshold: number;
    period: "monthly" | "quarterly" | "yearly";
  }>;
  approval_by_level?: number;
}

export interface ImpersonationConfig {
  enabled: boolean;
  allowed_levels?: number[];
  scope?: "subtree" | "direct";
}

export interface WorkspaceUser {
  id: string;
  workspace_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  manager_id: string | null;
  role_key: string | null;
  gdpr_consent_accepted_at: string | null;
  gdpr_consent_version: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceConfig {
  workspace: Workspace;
  user: WorkspaceUser;
  roles: WorkspaceRole[];
  meetingTypes: MeetingType[];
  followUpRules: FollowUpRules;
  metrics: Metric[];
  productionUnit: ProductionUnit | null;
  modules: ModulesConfig;
  promotion: PromotionConfig;
  impersonation: ImpersonationConfig;
  uiConfig: Record<string, unknown>;
  isLegatusAdmin: boolean;
}
