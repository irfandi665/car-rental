import { processDueNotifications } from "./processor";

const g = globalThis as unknown as { __notifLoop?: NodeJS.Timeout };

export function startNotificationLoop(intervalMs = 30_000) {
  if (g.__notifLoop) return;
  g.__notifLoop = setInterval(() => {
    processDueNotifications().catch((e) => console.error("[notif] loop error:", e));
  }, intervalMs);
  g.__notifLoop.unref?.();
}