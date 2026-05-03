import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushToUser, getVapidPublicKey } from "./push.server";
import { z } from "zod";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(
  async () => {
    return { publicKey: getVapidPublicKey() };
  },
);

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const saveSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscription: unknown; userAgent?: string }) => ({
    subscription: SubscriptionSchema.parse(data.subscription),
    userAgent: data.userAgent ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: userRow } = await supabase
      .from("users")
      .select("workspace_id")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          workspace_id: userRow?.workspace_id ?? null,
          endpoint: data.subscription.endpoint,
          subscription: data.subscription as never,
          user_agent: data.userAgent,
        },
        { onConflict: "user_id,endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) =>
    z.object({ endpoint: z.string().url() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPushNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; title: string; body: string; url?: string }) =>
    z
      .object({
        userId: z.string().uuid(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(500),
        url: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return sendPushToUser(data.userId, {
      title: data.title,
      body: data.body,
      url: data.url,
    });
  });
