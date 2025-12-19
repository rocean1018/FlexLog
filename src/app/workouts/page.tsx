"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StickyHeader } from "@/components/StickyHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useStore } from "@/lib/storage";
import { Units, WorkoutDay, WorkoutExercise } from "@/lib/types";
import { toast } from "@/components/ui/Toaster";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { computeStrengthSeries } from "@/lib/strength";
import { StrengthIndexCard } from "@/components/StrengthIndexCard";

const weekdayOptions = [
  { value: "", label: "Standalone (no weekday)" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function WorkoutsPage() {
  const store = useStore();
  const [hydrated, setHydrated] = useState(false);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [units, setUnits] = useState<Units>("lb");
  const [strengthEnabled, setStrengthEnabled] = useState(true);
  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [weightLogs, setWeightLogs] = useState<Record<string, number>>(() => store.getWeightLogs());
  const [editMode, setEditMode] = useState(false);
  const selected = useMemo(() => days.find((d) => d.id === selectedId) ?? null, [days, selectedId]);

  const strength = useMemo(() => {
    return computeStrengthSeries({
      workoutDays: days,
      units,
      bodyweight,
      bodyweightUnits: units,
    });
  }, [days, units, bodyweight]);

  const weightEntries = useMemo(() => {
    return Object.entries(weightLogs)
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [weightLogs]);

  useEffect(() => {
    const onboarding = store.getOnboarding();
    const initialDays = store.getWorkoutDays();
    const defaultUnits = (store.getUnits() ?? onboarding?.units ?? "lb") as Units;
    const enabled = store.getStrengthTrackerEnabled();
    const bwOverride = store.getBodyweightOverride();
    const bw = bwOverride ?? onboarding?.weight ?? null;

    setDays(initialDays);
    setSelectedId(initialDays[0]?.id ?? "");
    setUnits(defaultUnits);
    setStrengthEnabled(enabled);
    setBodyweight(bw);
    setWeightLogs(store.getWeightLogs());
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: WorkoutDay[]) {
    setDays(next);
    store.setWorkoutDays(next);
  }

  function addDay(name: string) {
    const day: WorkoutDay = {
      id: crypto.randomUUID(),
      name,
      weekday: null,
      sortOrder: days.length,
      exercises: [],
    };
    persist([...days, day]);
    setSelectedId(day.id);
  }

  function updateDay(day: WorkoutDay) {
    persist(days.map((d) => (d.id === day.id ? day : d)));
  }

  function deleteDay(id: string) {
    const next = days.filter((d) => d.id !== id);
    persist(next);
    setSelectedId(next[0]?.id ?? "");
  }

  function logWeight(date: string, weight: number) {
    if (!date || !Number.isFinite(weight) || weight <= 0) return;
    store.setWeightLog(date, weight);
    setWeightLogs(store.getWeightLogs());
    toast.success(`Logged ${weight} ${units} on ${date}`);
  }

  function removeWeightLog(date: string) {
    store.removeWeightLog(date);
    setWeightLogs(store.getWeightLogs());
    toast.success(`Removed weigh-in for ${date}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02040d] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-0 h-96 w-96 rounded-full bg-sky-500/10 blur-[220px]" />
        <div className="absolute right-0 bottom-[-20%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[200px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10 space-y-8">
        <StickyHeader
          title="Workouts"
          subtitle="Split builder + optional weight tracking"
          className="border-white/10 bg-white/5"
          right={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={editMode ? "secondary" : "ghost"}
                onClick={() => setEditMode((v) => !v)}
                aria-pressed={editMode}
              >
                {editMode ? "Editing enabled" : "Enable edit mode"}
              </Button>
              <Link href="/log">
                <Button variant="secondary">Back to log</Button>
              </Link>
            </div>
          }
        />

        <div>
          <StrengthIndexCard
            result={strength}
            enabled={strengthEnabled}
            weightEntries={weightEntries}
            onLogWeight={logWeight}
            defaultWeightDate={store.getSelectedDate() ?? new Date().toISOString().slice(0, 10)}
            units={units}
            onDeleteWeight={removeWeightLog}
          />
        </div>

        <div className="grid gap-6 items-start lg:grid-cols-[minmax(280px,340px),1fr]">
          <Card className="border-white/10 bg-black/30">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">Workout days</p>
                <div className="mt-1 text-3xl font-semibold">{days.length} plan{days.length === 1 ? "" : "s"}</div>
              </div>
              <AddWorkoutDay onAdd={addDay} disabled={!editMode} />
            </div>

            <div className="mt-5 grid gap-3">
              {days.map((d) => (
                <button
                  key={d.id}
                  className={[
                    "w-full rounded-3xl border px-4 py-4 text-left transition",
                    d.id === selectedId
                      ? "border-white/30 bg-white/10"
                      : "border-white/10 bg-white/5 hover:border-white/30",
                  ].join(" ")}
                  onClick={() => setSelectedId(d.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{d.name}</div>
                      <div className="text-xs text-white/60">
                        {d.weekday === null ? "Standalone" : weekdayOptions.find((w) => w.value === String(d.weekday))?.label}
                        {" • "}
                        {d.exercises.length} exercise{d.exercises.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-[0.3em] text-white/60">Edit</div>
                  </div>
                </button>
              ))}
              {days.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/70">
                  Add a workout day like “Push” or “Upper”.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-[#060c1a]/90 via-[#0f1326]/90 to-[#1b0c1b]/90">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/60">Editing</p>
                      <h2 className="text-3xl font-semibold">{selected.name}</h2>
                    </div>

                    <Button
                      className="w-full sm:w-auto"
                      variant="destructive"
                      onClick={() => deleteDay(selected.id)}
                      disabled={!editMode}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete day
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Day name"
                      value={selected.name}
                      onChange={(e) => updateDay({ ...selected, name: e.target.value })}
                      disabled={!editMode}
                    />
                    <Select
                      label="Map to weekday (optional)"
                      value={selected.weekday === null ? "" : String(selected.weekday)}
                      onChange={(v) => updateDay({ ...selected, weekday: v === "" ? null : Number(v) })}
                      options={weekdayOptions}
                      disabled={!editMode}
                    />
                  </div>

                  {!editMode ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/70">
                      Enable edit mode above to add, rename, or delete workout days and exercises.
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm uppercase tracking-[0.35em] text-white/60">Exercises</div>
                      <AddExercise
                        onAdd={(ex) => {
                          updateDay({ ...selected, exercises: [...selected.exercises, ex] });
                        }}
                        disabled={!editMode}
                      />
                    </div>

                    <div className="mt-4 grid gap-3">
                      {selected.exercises.length === 0 && (
                        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-sm text-white/70">
                          Add an exercise (sets/reps). Toggle weight tracking if you want history.
                        </div>
                      )}

                      {selected.exercises.map((ex) => (
                        <ExerciseRow
                          key={ex.id}
                          day={selected}
                          ex={ex}
                          onChange={(nextEx) => {
                            updateDay({
                              ...selected,
                              exercises: selected.exercises.map((x) => (x.id === nextEx.id ? nextEx : x)),
                            });
                          }}
                          onDelete={() => {
                            updateDay({
                              ...selected,
                              exercises: selected.exercises.filter((x) => x.id !== ex.id),
                            });
                          }}
                          editingEnabled={editMode}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-sm text-white/70">Select a workout day</div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AddWorkoutDay({ onAdd, disabled }: { onAdd: (name: string) => void; disabled?: boolean }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-end gap-2">
      <Input
        label="New day"
        placeholder="Push / Pull / Legs"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
      />
      <Button
        disabled={disabled}
        onClick={() => {
          const n = name.trim();
          if (!n) return;
          onAdd(n);
          setName("");
        }}
      >
        <Plus className="mr-2 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function AddExercise({ onAdd, disabled }: { onAdd: (ex: WorkoutExercise) => void; disabled?: boolean }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState<number>(3);
  const [reps, setReps] = useState<string>("8-12");
  const [trackWeight, setTrackWeight] = useState<boolean>(false);

  return (
    <div className="mt-2 grid w-full gap-3 rounded-3xl border border-white/10 bg-black/30 p-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <Input label="Exercise" placeholder="Bench Press" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      <Input label="Sets" type="number" value={sets} onChange={(e) => setSets(Number(e.target.value))} disabled={disabled} />
      <Input label="Reps" value={reps} onChange={(e) => setReps(e.target.value)} disabled={disabled} />
      <div className="flex flex-col gap-2 sm:gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:col-span-1">
        <Button
          className="w-full sm:w-auto"
          variant={trackWeight ? "secondary" : "ghost"}
          onClick={() => setTrackWeight((v) => !v)}
          title="Toggle weight tracking"
          disabled={disabled}
        >
          {trackWeight ? "Track weight: ON" : "Track weight: OFF"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={disabled}
          onClick={() => {
            const n = name.trim();
            if (!n) return;
            onAdd({
              id: crypto.randomUUID(),
              name: n,
              sets,
              reps,
              trackWeight,
              logs: [],
            });
            setName("");
            toast.success("Exercise added");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function ExerciseRow({
  day,
  ex,
  onChange,
  onDelete,
  editingEnabled,
}: {
  day: WorkoutDay;
  ex: WorkoutExercise;
  onChange: (ex: WorkoutExercise) => void;
  onDelete: () => void;
  editingEnabled: boolean;
}) {
  const store = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [weight, setWeight] = useState<number>(0);

  const last = ex.logs.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const todayEntry = ex.logs.find((l) => l.date === today);

  function logWeight() {
    if (!ex.trackWeight) return;
    if (!weight) return;
    const next = {
      ...ex,
      logs: [...ex.logs.filter((l) => l.date !== today), { date: today, weight }],
    };
    onChange(next);
    store.bumpWorkoutIndicator(today);
    toast.success("Logged weight for today");
  }

  function clearWeight() {
    if (!ex.trackWeight) return;
    const next = {
      ...ex,
      logs: ex.logs.filter((l) => l.date !== today),
    };
    onChange(next);
    toast.success("Removed today's logged weight");
  }

  return (
    <motion.div layout className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold">{ex.name}</div>
          <div className="text-sm text-white/70">
            {ex.sets} sets • {ex.reps} reps • {ex.trackWeight ? "Weight tracking ON" : "Weight tracking OFF"}
          </div>
          {last && ex.trackWeight && (
            <div className="mt-1 text-xs text-white/50">
              Last: {last.weight} on {last.date}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {ex.trackWeight && (
            <>
              <Input
                label={`Today (${today})`}
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full sm:w-32"
              />
              <Button className="w-full sm:w-auto" onClick={logWeight}>
                Save
              </Button>
              {todayEntry ? (
                <Button className="w-full sm:w-auto" variant="ghost" onClick={clearWeight}>
                  Clear today
                </Button>
              ) : null}
            </>
          )}
          <Button className="w-full sm:w-auto" variant="destructive" onClick={onDelete} disabled={!editingEnabled}>
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
