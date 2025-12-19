"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MealGroup } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function MealGroupCard({
  date,
  group,
  onChange,
  onDelete,
}: {
  date: string;
  group: MealGroup;
  onChange: (g: MealGroup) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const totals = useMemo(() => {
    return group.items.reduce(
      (acc, it) => {
        acc.calories += it.calories;
        acc.protein_g += it.protein_g;
        acc.carbs_g += it.carbs_g;
        acc.fat_g += it.fat_g;
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [group.items]);

  return (
    <motion.div layout>
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            {!editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ ...group, collapsed: !group.collapsed })}
                  className="grid h-9 w-9 place-items-center rounded-2xl bg-zinc-900/40 ring-1 ring-zinc-800 transition hover:bg-zinc-900/60"
                  title={group.collapsed ? "Expand" : "Collapse"}
                >
                  <motion.div animate={{ rotate: group.collapsed ? -90 : 0 }} transition={{ duration: 0.18 }}>
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </button>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-tight">{group.name}</div>
                  <div className="text-sm text-zinc-400">
                    {totals.calories.toFixed(0)} kcal • P {totals.protein_g.toFixed(0)}g • C {totals.carbs_g.toFixed(0)}g • F {totals.fat_g.toFixed(0)}g
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <Input label="Meal group name" value={name} onChange={(e) => setName(e.target.value)} />
                <Button
                  onClick={() => {
                    const n = name.trim();
                    if (!n) return;
                    onChange({ ...group, name: n });
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button variant="ghost" onClick={() => { setEditing(false); setName(group.name); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <Link href={`/foods?group=${group.id}`}>
                <Button variant="secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add food
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setEditing(true)}>Rename</Button>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!group.collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-900 p-4">
                {group.items.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">
                    No foods yet. Click “Add food”.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {group.items.map((it) => (
                      <motion.div
                        layout
                        key={it.id}
                        className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{it.name}</div>
                            <div className="text-sm text-zinc-400">
                              {it.calories.toFixed(0)} kcal • P {it.protein_g.toFixed(0)}g • C {it.carbs_g.toFixed(0)}g • F {it.fat_g.toFixed(0)}g
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {it.source}{it.barcode ? ` • ${it.barcode}` : ""} • {it.qty} {it.unit}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const next = { ...group, items: group.items.filter((x) => x.id !== it.id) };
                              onChange(next);
                            }}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700"
                            title="Remove item"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
