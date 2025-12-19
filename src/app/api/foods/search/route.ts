import { NextResponse } from "next/server";
import { normalizeFdcSearchResults } from "@/lib/food/normalize";
import { cacheGet, cacheSet } from "@/lib/food/cache";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const key = `fdc:search:${q.toLowerCase()}`;
  const cached = await cacheGet(key);
  if (cached) return NextResponse.json({ results: cached });

  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    // No key configured: still return empty to keep app usable (manual fallback in UI)
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 15,
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
      }),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const results = normalizeFdcSearchResults(data);
    await cacheSet(key, results, 60 * 60); // 1 hour
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
