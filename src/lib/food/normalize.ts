import type { FoodResult } from "@/lib/types";

function getNutrient(nutrients: any[], nameOrNumber: string | number): number | null {
  if (!Array.isArray(nutrients)) return null;
  for (const n of nutrients) {
    if (typeof nameOrNumber === "number" && n.nutrientNumber === String(nameOrNumber)) return Number(n.value ?? 0);
    if (typeof nameOrNumber === "string" && (n.nutrientName === nameOrNumber || n.name === nameOrNumber)) return Number(n.value ?? 0);
  }
  return null;
}

export function normalizeFdcSearchResults(data: any): FoodResult[] {
  const foods = data?.foods ?? [];
  const out: FoodResult[] = [];
  for (const f of foods) {
    const nutrients = f.foodNutrients ?? [];
    // FDC: calories nutrientNumber 208, protein 203, carbs 205, fat 204
    const calories = getNutrient(nutrients, 208) ?? 0;
    const protein = getNutrient(nutrients, 203) ?? 0;
    const carbs = getNutrient(nutrients, 205) ?? 0;
    const fat = getNutrient(nutrients, 204) ?? 0;

    const name = (f.description ?? "Food").toString();
    out.push({
      name,
      brand: f.brandOwner ?? null,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      source: "FDC",
      sourceId: f.fdcId ? String(f.fdcId) : null,
      unit: "100g",
      per: "100g",
    });
  }
  return out;
}

export function normalizeOffProduct(data: any, barcode: string): FoodResult | null {
  if (!data) return null;
  if (data.status !== 1) return null;

  const p = data.product ?? {};
  const name = p.product_name || p.product_name_en || p.generic_name || "Product";
  const nutr = p.nutriments ?? {};
  // OFF commonly provides per 100g values (kcal_100g, proteins_100g, carbohydrates_100g, fat_100g)
  const calories = Number(nutr["energy-kcal_100g"] ?? nutr["energy-kcal_serving"] ?? 0);
  const protein = Number(nutr["proteins_100g"] ?? nutr["proteins_serving"] ?? 0);
  const carbs = Number(nutr["carbohydrates_100g"] ?? nutr["carbohydrates_serving"] ?? 0);
  const fat = Number(nutr["fat_100g"] ?? nutr["fat_serving"] ?? 0);

  return {
    name: String(name),
    brand: p.brands ? String(p.brands) : null,
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    source: "OFF",
    sourceId: p.id ? String(p.id) : null,
    barcode,
    unit: nutr["energy-kcal_100g"] != null ? "100g" : "serving",
    per: nutr["energy-kcal_100g"] != null ? "100g" : "serving",
  };
}
