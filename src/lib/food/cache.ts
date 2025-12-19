import { supabaseService } from "@/lib/supabase/server";

// Simple layered cache:
// 1) In-memory (best effort; serverless instances are ephemeral)
// 2) Supabase food_cache table (optional if service key configured)
const mem = new Map<string, { expiresAt: number; value: any }>();

export async function cacheGet(key: string) {
  const now = Date.now();
  const inMem = mem.get(key);
  if (inMem && inMem.expiresAt > now) return inMem.value;

  const sb = supabaseService();
  if (!sb) return null;

  const { data } = await sb
    .from("food_cache")
    .select("normalized_json, expires_at")
    .eq("cache_key", key)
    .maybeSingle();

  if (!data) return null;
  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expiresAt && expiresAt < now) return null;

  const value = data.normalized_json;
  mem.set(key, { expiresAt: expiresAt || now + 5 * 60 * 1000, value });
  return value;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number) {
  const now = Date.now();
  mem.set(key, { expiresAt: now + ttlSeconds * 1000, value });

  const sb = supabaseService();
  if (!sb) return;

  const expiresAtIso = new Date(now + ttlSeconds * 1000).toISOString();

  await sb.from("food_cache").upsert({
    cache_key: key,
    normalized_json: value,
    raw_json: null,
    expires_at: expiresAtIso,
    updated_at: new Date().toISOString(),
  });
}
