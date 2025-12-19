import { NextResponse } from "next/server";
import { normalizeOffProduct } from "@/lib/food/normalize";
import { cacheGet, cacheSet } from "@/lib/food/cache";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ result: null });

  const key = `off:barcode:${code}`;
  const cached = await cacheGet(key);
  if (cached) return NextResponse.json({ result: cached });

  const ua = process.env.OFF_USER_AGENT || "FlexLog/0.1 (example@example.com)";

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
      headers: { "User-Agent": ua },
    });
    if (!res.ok) return NextResponse.json({ result: null });

    const data = await res.json();
    const result = normalizeOffProduct(data, code);
    if (result) await cacheSet(key, result, 24 * 60 * 60); // 24 hours
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ result: null });
  }
}
