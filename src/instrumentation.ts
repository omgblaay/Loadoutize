export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    const { startWeaponBuilderBridge } = await import("@/lib/weaponBuilderBridge.server");
    await startWeaponBuilderBridge();
  }
}
