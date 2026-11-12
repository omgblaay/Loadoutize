import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { bridgePaths } from "@/lib/weaponBuilderBridge.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const { targetDir, snapshotPath, catalogPath } = bridgePaths();
  const files = [catalogPath, snapshotPath, path.join(targetDir, "compositor.js")];
  const stamps = await Promise.all(files.map(async (file) => {
    const info = await stat(file);
    return `${info.mtimeMs}:${info.size}`;
  }));
  return NextResponse.json({ revision: stamps.join("|") }, {
    headers: { "Cache-Control": "no-store" },
  });
}
