import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getPushPublicKey,
  saveSubscription,
  deleteSubscription,
} from "@/server/push.functions";

type Status = "unsupported" | "blocked" | "denied" | "default" | "granted";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function usePushNotifications() {
  const [status, setStatus] = useState<Status>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPublicKeyFn = useServerFn(getPushPublicKey);
  const saveFn = useServerFn(saveSubscription);
  const deleteFn = useServerFn(deleteSubscription);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    if (isInIframe()) {
      // Push registration in iframes is unreliable — disable
      setStatus("blocked");
      return;
    }
    setStatus(Notification.permission as Status);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // CRITICAL: must be called from a user gesture (click handler), not from useEffect
  const subscribe = useCallback(async () => {
    setError(null);
    if (!isSupported()) {
      setError("Push notifikace nejsou v tomto prohlížeči podporované.");
      return;
    }
    if (isInIframe()) {
      setError(
        "Push notifikace nejsou dostupné v náhledu. Otevřete publikovanou aplikaci.",
      );
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as Status);
      if (permission !== "granted") {
        setError("Oprávnění zamítnuto.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;

      const { publicKey } = await getPublicKeyFn();
      const keyBytes = urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength,
        ) as ArrayBuffer,
      });

      await saveFn({
        data: {
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        },
      });
      setIsSubscribed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [getPublicKeyFn, saveFn]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deleteFn({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [deleteFn]);

  return { status, isSubscribed, busy, error, subscribe, unsubscribe, refresh };
}
