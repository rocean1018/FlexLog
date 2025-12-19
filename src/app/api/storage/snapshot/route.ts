import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const admin = getSupabaseAdmin();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  if (!admin) {
    return NextResponse.json({ snapshot: null, reason: "not_configured" });
  }

  const { data, error } = await admin
    .from("guest_snapshots")
    .select("state")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch guest snapshot", error);
    return NextResponse.json({ error: "supabase_error" }, { status: 500 });
  }

  return NextResponse.json({ snapshot: data?.state ?? null });
}

export async function POST(req: Request) {
  if (!admin) {
    return NextResponse.json({ synced: false, reason: "not_configured" });
  }

  const payload = await req.json().catch(() => null);
  const deviceId: string | undefined = payload?.deviceId;
  const state = payload?.state;

  if (!deviceId || typeof deviceId !== "string") {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  if (!state || typeof state !== "object") {
    return NextResponse.json({ error: "state must be an object" }, { status: 400 });
  }

  const { error } = await admin.from("guest_snapshots").upsert(
    {
      device_id: deviceId,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id" },
  );

  if (error) {
    console.error("Failed to persist guest snapshot", error);
    return NextResponse.json({ synced: false, error: "supabase_error" }, { status: 500 });
  }

  return NextResponse.json({ synced: true });
}
