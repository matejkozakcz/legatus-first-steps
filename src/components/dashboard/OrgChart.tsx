import { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { Plus, Minus, ZoomIn, ZoomOut, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { paletteForLevel } from "./RoleBadge";

interface UserNode {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_key: string | null;
  manager_id: string | null;
}

interface OrgChartProps {
  periodStart: string;
  periodEnd: string;
  onImpersonate?: (userId: string, name: string) => void;
}

const LINE = "hsl(var(--border))";

function NodeCard({
  node,
  bj,
  unitLabel,
  roleLabel,
  roleColor,
  canImpersonate,
  onImpersonate,
}: {
  node: UserNode;
  bj: number;
  unitLabel: string;
  roleLabel: string;
  roleColor: string;
  canImpersonate: boolean;
  onImpersonate?: () => void;
}) {
  const initials = (node.full_name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="relative flex flex-col items-center flex-shrink-0 bg-card dark:bg-white/[0.05]"
      style={{
        width: 160,
        minHeight: 110,
        borderRadius: 12,
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        paddingTop: 10,
        paddingBottom: 14,
        overflow: "hidden",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 8, left: 8,
          padding: "2px 8px",
          borderRadius: 20,
          background: roleColor,
          fontSize: 9,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 0.3,
          lineHeight: "16px",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {roleLabel}
      </div>
      {canImpersonate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onImpersonate?.(); }}
          title="Zobrazit pohled uživatele"
          className="absolute text-muted-foreground hover:text-foreground transition-colors"
          style={{ top: 8, right: 8, background: "transparent", border: "none", lineHeight: 0, padding: 0 }}
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
      <div style={{ marginTop: 14 }}>
        {node.avatar_url ? (
          <img
            src={node.avatar_url}
            alt={node.full_name || ""}
            loading="lazy"
            className="rounded-full object-cover"
            style={{ width: 56, height: 56, border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-semibold"
            style={{ width: 56, height: 56, background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 18, border: "2px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
          >
            {initials}
          </div>
        )}
      </div>
      <p
        className="font-heading font-semibold text-center leading-tight px-2 mt-2 text-foreground truncate w-full"
        style={{ fontSize: 13 }}
        title={node.email || undefined}
      >
        {node.full_name || node.email || "—"}
      </p>
      <p className="text-center font-heading font-semibold mt-0.5" style={{ fontSize: 11, color: roleColor }}>
        {bj.toLocaleString("cs-CZ")} {unitLabel} tým
      </p>
    </div>
  );
}

function VLine({ height = 24 }: { height?: number }) {
  return <div style={{ width: 2, height, background: LINE, margin: "0 auto" }} />;
}

function ToggleBtn({ expanded, count, onClick }: { expanded: boolean; count: number; onClick: () => void }) {
  const Icon = expanded ? Minus : Plus;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 border"
      style={{ width: 32, height: 32 }}
      title={expanded ? "Sbalit" : `Zobrazit ${count} podřízených`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

interface RenderProps {
  node: UserNode;
  childrenMap: Map<string, UserNode[]>;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  depth: number;
  bjMap: Map<string, number>;
  unitLabel: string;
  roleLabel: (key: string | null) => string;
  roleColor: (key: string | null) => string;
  canImpersonateFn: (n: UserNode) => boolean;
  onImpersonate?: (id: string, name: string) => void;
}

function ChildrenBranch(props: { items: UserNode[] } & Omit<RenderProps, "node" | "depth"> & { depth: number }) {
  const { items } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [line, setLine] = useState({ left: 0, width: 0 });

  const recalc = useCallback(() => {
    const c = containerRef.current;
    if (!c || items.length < 2) return;
    const f = refs.current[0];
    const l = refs.current[items.length - 1];
    if (!f || !l) return;
    const cr = c.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const lr = l.getBoundingClientRect();
    const fc = fr.left + fr.width / 2 - cr.left;
    const lc = lr.left + lr.width / 2 - cr.left;
    setLine({ left: fc, width: lc - fc });
  }, [items.length]);

  useLayoutEffect(() => { recalc(); }, [recalc, props.collapsed]);
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => recalc());
    ro.observe(c);
    return () => ro.disconnect();
  }, [recalc]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center">
      {items.length > 1 && (
        <div style={{ position: "absolute", top: 0, left: line.left, width: line.width, height: 2, background: LINE }} />
      )}
      <div className="flex" style={{ gap: 24 }}>
        {items.map((child, i) => (
          <div
            key={child.id}
            ref={(el) => { refs.current[i] = el; }}
            className="flex flex-col items-center"
          >
            {items.length > 1 && <VLine height={16} />}
            <TreeNode {...props} node={child} depth={props.depth} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TreeNode(props: RenderProps) {
  const { node, childrenMap, collapsed, toggle, depth, bjMap, unitLabel, roleLabel, roleColor, canImpersonateFn, onImpersonate } = props;
  const kids = childrenMap.get(node.id) || [];
  const isCol = collapsed.has(node.id);

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        bj={bjMap.get(node.id) || 0}
        unitLabel={unitLabel}
        roleLabel={roleLabel(node.role_key)}
        roleColor={roleColor(node.role_key)}
        canImpersonate={canImpersonateFn(node)}
        onImpersonate={() => onImpersonate?.(node.id, node.full_name || "—")}
      />
      {kids.length > 0 && (
        <>
          <VLine />
          {isCol ? (
            <ToggleBtn expanded={false} count={kids.length} onClick={() => toggle(node.id)} />
          ) : (
            <>
              {depth > 0 && (
                <>
                  <ToggleBtn expanded={true} count={kids.length} onClick={() => toggle(node.id)} />
                  <VLine />
                </>
              )}
              <ChildrenBranch
                items={kids}
                childrenMap={childrenMap}
                collapsed={collapsed}
                toggle={toggle}
                depth={depth + 1}
                bjMap={bjMap}
                roleLabel={roleLabel}
                roleColor={roleColor}
                canImpersonateFn={canImpersonateFn}
                onImpersonate={onImpersonate}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export function OrgChart({ periodStart, periodEnd, onImpersonate }: OrgChartProps) {
  const { workspace, user, isLegatusAdmin } = useWorkspace();
  const { roles, currentLevel } = useRoles();
  const [zoom, setZoom] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: users = [] } = useQuery({
    queryKey: ["org_users", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url, role_key, manager_id")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as UserNode[];
    },
    enabled: !!workspace?.id,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["org_meetings_period", workspace?.id, periodStart, periodEnd],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("meetings")
        .select("user_id, result, status")
        .eq("workspace_id", workspace.id)
        .gte("scheduled_at", periodStart)
        .lte("scheduled_at", periodEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspace?.id,
  });

  const childrenMap = useMemo(() => {
    const m = new Map<string, UserNode[]>();
    users.forEach((u) => {
      if (u.manager_id) {
        const arr = m.get(u.manager_id) || [];
        arr.push(u);
        m.set(u.manager_id, arr);
      }
    });
    return m;
  }, [users]);

  // Personal BJ from result.bj or result.podepsane_bj
  const personalBj = useMemo(() => {
    const m = new Map<string, number>();
    meetings.forEach((mt: any) => {
      const r = mt.result || {};
      const v = Number(r.bj ?? r.podepsane_bj ?? 0);
      if (v) m.set(mt.user_id, (m.get(mt.user_id) || 0) + v);
    });
    return m;
  }, [meetings]);

  // Recursive team BJ
  const teamBj = useMemo(() => {
    const m = new Map<string, number>();
    function compute(id: string): number {
      if (m.has(id)) return m.get(id)!;
      let total = personalBj.get(id) || 0;
      const kids = childrenMap.get(id) || [];
      for (const k of kids) total += compute(k.id);
      m.set(id, total);
      return total;
    }
    users.forEach((u) => compute(u.id));
    return m;
  }, [users, childrenMap, personalBj]);

  const roots = useMemo(() => {
    const ids = new Set(users.map((u) => u.id));
    return users.filter((u) => !u.manager_id || !ids.has(u.manager_id));
  }, [users]);

  const roleByKey = useMemo(() => {
    const m = new Map(roles.map((r) => [r.key, r]));
    return m;
  }, [roles]);

  const roleLabel = (key: string | null) => (key && roleByKey.get(key)?.label) || "—";
  const roleColor = (key: string | null) => {
    if (!key) return "#89ADB4";
    const r = roleByKey.get(key);
    if (!r) return "#89ADB4";
    return paletteForLevel(r.level).dot;
  };

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canImpersonateFn = (n: UserNode) => {
    if (!user) return false;
    if (n.id === user.id) return false;
    if (isLegatusAdmin) return true;
    return currentLevel != null && currentLevel <= 2;
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.min(z + 0.1, 1.5))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>
      <div className="overflow-auto w-full h-full p-4">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s" }}>
          {roots.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Žádní členové týmu.</p>
          ) : (
            <div className="flex flex-col items-center gap-12">
              {roots.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  childrenMap={childrenMap}
                  collapsed={collapsed}
                  toggle={toggle}
                  depth={0}
                  bjMap={teamBj}
                  roleLabel={roleLabel}
                  roleColor={roleColor}
                  canImpersonateFn={canImpersonateFn}
                  onImpersonate={onImpersonate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
