import { readFile } from "node:fs/promises";
import { rename, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { bridgePaths, queueWrite, SOURCE_ORIGINS, validSnapshot } from "@/lib/weaponBuilderBridge.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (origin && SOURCE_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const origin = req.headers.get("origin");
  if (!origin || !SOURCE_ORIGINS.has(origin)) {
    return NextResponse.json({ error: "Original local builder only" }, { status: 403, headers: corsHeaders(origin) });
  }
  try {
    const body = await req.text();
    if (body.length > 500_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: corsHeaders(origin) });
    }
    await queueWrite(async () => {
      const snapshot = JSON.parse(body);
      if (!validSnapshot(snapshot)) throw new Error("Invalid source calibration");
      const { snapshotPath } = bridgePaths();
      const temporary = `${snapshotPath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n");
      await rename(temporary, snapshotPath);
    });
    return NextResponse.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders(origin) });
  }
}
