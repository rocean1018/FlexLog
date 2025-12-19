"use client";

import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StrengthSeriesResult, StrengthPoint } from "@/lib/strength";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatPct(v: number | undefined) {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

type WeightEntry = { date: string; weight: number };

function Sparkline({
  primarySeries,
  weightSeries,
  yUnitLabel,
}: {
  primarySeries: StrengthPoint[];
  weightSeries?: WeightEntry[];
  yUnitLabel?: string;
}) {
  const WIDTH = 800;
  const HEIGHT = 320;
  const padding = { top: 28, right: 36, bottom: 56, left: 80 };
  const chartWidth = WIDTH - padding.left - padding.right;
  const chartHeight = HEIGHT - padding.top - padding.bottom;

  if (!primarySeries.length) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-white/60">
        Not enough data yet.
      </div>
    );
  }

  const dateCollector = new Set<string>();
  primarySeries.forEach((p) => dateCollector.add(p.date));
  weightSeries?.forEach((w) => dateCollector.add(w.date));
  const timeline = Array.from(dateCollector).sort();
  const resolvedDates = timeline.length ? timeline : primarySeries.map((p) => p.date);
  const dateIndex = new Map(resolvedDates.map((d, idx) => [d, idx]));
  const dateDenom = Math.max(1, resolvedDates.length - 1);
  const fallbackDenom = Math.max(1, primarySeries.length - 1);

  const rawValues = primarySeries.map((p) => p.index);
  let minValue = Math.min(...rawValues);
  let maxValue = Math.max(...rawValues);
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    minValue = 0;
    maxValue = 1;
  }
  if (Math.abs(maxValue - minValue) < 1e-6) {
    const paddingAmount = Math.max(1, Math.abs(maxValue || 1) * 0.25);
    minValue -= paddingAmount;
    maxValue += paddingAmount;
  }
  const range = maxValue - minValue;
  const valueFormatter =
    range < 2 ? (value: number) => value.toFixed(2) : range < 20 ? (value: number) => value.toFixed(1) : (value: number) => value.toFixed(0);

  const getX = (date: string, fallbackIndex: number) => {
    if (!resolvedDates.length) {
      return padding.left + (fallbackIndex / fallbackDenom) * chartWidth;
    }
    const idx = dateIndex.get(date);
    const ratio =
      idx !== undefined
        ? (resolvedDates.length === 1 ? 0 : idx / dateDenom)
        : fallbackIndex / fallbackDenom;
    return padding.left + ratio * chartWidth;
  };
  const getY = (value: number) => {
    return padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const mainPoints = primarySeries
    .map((point, idx) => `${getX(point.date, idx).toFixed(1)},${getY(point.index).toFixed(1)}`)
    .join(" ");

  let weightPoints = "";
  if (weightSeries && weightSeries.length >= 2) {
    const weights = weightSeries.map((w) => w.weight);
    let wMin = Math.min(...weights);
    let wMax = Math.max(...weights);
    if (Math.abs(wMax - wMin) < 1e-6) {
      const padAmt = Math.max(1, Math.abs(wMax || 1) * 0.25);
      wMin -= padAmt;
      wMax += padAmt;
    }
    const wRange = wMax - wMin;
    weightPoints = weightSeries
      .map((entry) => {
        const x = getX(entry.date, 0);
        const y = padding.top + chartHeight - ((entry.weight - wMin) / wRange) * chartHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const yTicks = Array.from({ length: 4 }, (_, idx) => {
    const ratio = idx / 3;
    const value = maxValue - ratio * (maxValue - minValue);
    return { value, y: getY(value) };
  });

  const firstDate = resolvedDates[0] ?? primarySeries[0]?.date ?? "";
  const lastDate = resolvedDates[resolvedDates.length - 1] ?? primarySeries[primarySeries.length - 1]?.date ?? "";

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-64 w-full sm:h-72 lg:h-[320px]"
        preserveAspectRatio="none"
      >
        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={HEIGHT - padding.bottom}
          stroke="currentColor"
          className="text-white/20"
        />
        <line
          x1={padding.left}
          y1={HEIGHT - padding.bottom}
          x2={WIDTH - padding.right}
          y2={HEIGHT - padding.bottom}
          stroke="currentColor"
          className="text-white/20"
        />
        {/* Grid + ticks */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              x2={WIDTH - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="currentColor"
              strokeDasharray="4 6"
              className="text-white/10"
            />
            <text
              x={8}
              y={tick.y + 4}
              className="fill-current text-[11px] font-medium uppercase tracking-wide text-white/60"
            >
              {valueFormatter(tick.value)}
            </text>
          </g>
        ))}
        {/* Series */}
        {weightPoints ? (
          <polyline
            points={weightPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-sky-300/80 drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]"
          />
        ) : null}
        {mainPoints ? (
          <polyline
            points={mainPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.35)]"
          />
        ) : null}
        {/* Axis labels */}
        {yUnitLabel ? (
          <text
            x={8}
            y={padding.top - 4}
            className="fill-current text-[11px] font-semibold uppercase tracking-wide text-white/70"
          >
            {yUnitLabel}
          </text>
        ) : null}
        <text
          x={padding.left}
          y={HEIGHT - 12}
          className="fill-current text-[11px] font-medium uppercase tracking-wide text-white/60"
        >
          {firstDate}
        </text>
        <text
          x={WIDTH - padding.right - 80}
          y={HEIGHT - 12}
          className="fill-current text-[11px] font-medium uppercase tracking-wide text-white/60"
        >
          {lastDate}
        </text>
      </svg>
    </div>
  );
}

export function StrengthIndexCard({
  result,
  enabled,
  weightEntries = [],
  onLogWeight,
  onDeleteWeight,
  defaultWeightDate,
  units,
}: {
  result: StrengthSeriesResult;
  enabled: boolean;
  weightEntries?: WeightEntry[];
  onLogWeight?: (date: string, weight: number) => void;
  onDeleteWeight?: (date: string) => void;
  defaultWeightDate?: string;
  units?: string;
}) {
  const [open, setOpen] = useState(true);
  const [weightDate, setWeightDate] = useState(defaultWeightDate ?? new Date().toISOString().slice(0, 10));
  const [weightValue, setWeightValue] = useState("");

  useEffect(() => {
    if (defaultWeightDate) setWeightDate(defaultWeightDate);
  }, [defaultWeightDate]);

  const sortedWeightEntries = useMemo(
    () => weightEntries.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [weightEntries],
  );

  const hasStrengthSeries = result.series.length >= 2;
  const hasWeightSeries = sortedWeightEntries.length >= 2;

  const graphSeries: StrengthPoint[] = useMemo(() => {
    if (hasStrengthSeries) return result.series;
    if (hasWeightSeries) {
      return sortedWeightEntries.map((entry) => ({
        date: entry.date,
        index: entry.weight,
        entries: 1,
      }));
    }
    return result.series;
  }, [hasStrengthSeries, hasWeightSeries, result.series, sortedWeightEntries]);

  const overlayWeights = hasStrengthSeries && hasWeightSeries ? sortedWeightEntries : undefined;
  const yAxisLabel = hasStrengthSeries ? "Strength index (× bodyweight)" : units ? `Weight (${units})` : "Weight";

  const current = result.current ?? (result.series[result.series.length - 1]?.index ?? undefined);

  if (!enabled) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Activity className="h-4 w-4" /> Strength Index
            </div>
            <div className="mt-2 text-sm text-white/70">Disabled in Settings.</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Activity className="h-4 w-4" /> Strength Index
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="text-3xl font-semibold tracking-tight">
              {current ? `${current.toFixed(2)}x` : "—"}
            </div>
            <div className="text-sm text-white/60">bodyweight (avg e1RM / BW)</div>
            <div className="text-sm text-white/70">{formatPct(result.changePct)} vs baseline</div>
          </div>
        </div>

        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? (
            <>
              Details <ChevronUp className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Details <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(260px,360px)]">
              <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                {result.ok || hasWeightSeries ? (
                  <>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                      <span>Trend</span>
                      {overlayWeights ? <span className="text-sky-300">Weight overlay</span> : null}
                    </div>
                    <div className="mt-2">
                      <Sparkline primarySeries={graphSeries} weightSeries={overlayWeights} yUnitLabel={yAxisLabel} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
                      <span>{result.distinctDays} logged days</span>
                      <span>{result.totalEntries} entries</span>
                      <span>baseline≈{(result.baseline ?? 0).toFixed(2)}x</span>
                      {!result.ok && hasWeightSeries ? <span className="text-sky-300">Showing weight-only trend</span> : null}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/70">{result.reason}</div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/60">Method</div>
                  <div className="mt-2 text-sm text-white/80">
                    Uses Epley estimated 1RM, adjusts for lift type (compound vs isolation expectations), then normalizes by bodyweight.
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    Tip: track weights consistently for the same lifts for the cleanest signal.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/60">Weight tracker</div>
                  <form
                    className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_120px]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const parsed = parseFloat(weightValue);
                      if (!onLogWeight || !Number.isFinite(parsed) || parsed <= 0) return;
                      onLogWeight(weightDate, parsed);
                      setWeightValue("");
                    }}
                  >
                    <Input
                      label="Date"
                      type="date"
                      value={weightDate}
                      onChange={(e) => setWeightDate(e.target.value)}
                      required
                      className="w-full"
                    />
                    <Input
                      label={`Weight (${units ?? "units"})`}
                      type="number"
                      step="0.1"
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      required
                      className="w-full"
                    />
                    <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
                      <Button type="submit" className="w-full">
                        Save
                      </Button>
                    </div>
                  </form>
                  {weightEntries.length ? (
                    <div className="mt-3 space-y-2 font-mono text-sm text-white/80">
                      {weightEntries
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5)
                        .map((entry) => (
                          <div key={entry.date} className="flex items-center justify-between gap-2">
                            <span>
                              {entry.date} · {entry.weight}
                              {units ?? ""}
                            </span>
                            {onDeleteWeight ? (
                              <button
                                type="button"
                                className="text-rose-300 hover:text-rose-200"
                                onClick={() => onDeleteWeight(entry.date)}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-white/60">No weigh-ins yet.</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
