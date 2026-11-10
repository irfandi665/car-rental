export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationLoop } = await import("./lib/notifications/loop");
    startNotificationLoop();
  }
}