import type { Units, WorkoutDay, WorkoutExercise } from "@/lib/types";

export type StrengthPoint = {
  date: string; // yyyy-MM-dd
  index: number; // relative strength (x bodyweight)
  entries: number; // number of exercise datapoints used
};

function toLbs(value: number, units: Units): number {
  return units === "kg" ? value * 2.2046226218 : value;
}

/**
 * Parse a reps string like "8", "8-12", "5x5" into a single reps estimate.
 * We use the average of a range ("8-12" -> 10) to be less noisy.
 */
export function parseRepsEstimate(reps: string): number {
  const cleaned = reps.toLowerCase().replace(/\s/g, "");
  // common patterns: 8-12, 5x5, 3x10, 8, 10+
  const range = cleaned.match(/(\d+)-(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return (a + b) / 2;
  }
  const mult = cleaned.match(/(\d+)x(\d+)/);
  if (mult) {
    const repsPart = Number(mult[2]);
    if (Number.isFinite(repsPart) && repsPart > 0) return repsPart;
  }
  const single = cleaned.match(/(\d+)/);
  if (single) {
    const v = Number(single[1]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 8;
}

/**
 * Epley estimated 1RM: 1RM ~= weight * (1 + reps/30).
 * Good general-purpose proxy for "strength" from submax sets.
 */
export function estimate1RM(weight: number, reps: number): number {
  const r = Math.max(1, Math.min(15, reps));
  return weight * (1 + r / 30);
}

export type StrengthSeriesResult = {
  series: StrengthPoint[];
  distinctDays: number;
  totalEntries: number;
  baseline?: number;
  current?: number;
  changePct?: number;
  ok: boolean;
  reason?: string;
};

type MovementProfile = {
  id: string;
  expectedRelative: number; // expected e1RM / BW for "average" lifter on this movement
  label?: string;
  description?: string;
};

type MovementProfileMatcher = {
  profile: MovementProfile;
  patterns: RegExp[];
};

const movementProfiles: MovementProfileMatcher[] = [
  {
    profile: {
      id: "squat-back-front",
      label: "Squat (Back/Front)",
      description: "Bilateral squat patterns emphasizing knee and hip extension.",
      expectedRelative: 1.7,
    },
    patterns: [
      /\b(back\s*squat|squat\s*back|high\s*bar\s*squat|low\s*bar\s*squat)\b/i,
      /\b(front\s*squat|fsq|f\s*squat)\b/i,
      /\b(safety\s*bar\s*squat|ssb\s*squat|ssb)\b/i,
      /\b(pause\s*squat|tempo\s*squat|box\s*squat)\b/i,
      /\b(squat)\b/i,
    ],
  },
  {
    profile: {
      id: "squat-specialty-zercher-jefferson",
      label: "Squat (Specialty)",
      description: "Specialty squat variants like Zercher, Jefferson, hack, goblet, overhead.",
      expectedRelative: 1.5,
    },
    patterns: [
      /\bzercher\b/i,
      /\b(jefferson\s*squat|jefferson)\b/i,
      /\bhack\s*squat\b/i,
      /\bgoblet\s*squat\b/i,
      /\b(overhead\s*squat|oh\s*squat)\b/i,
    ],
  },
  {
    profile: {
      id: "deadlift-conventional-sumo",
      label: "Deadlift (Conventional/Sumo)",
      description: "Heavy hip hinge pulls from the floor.",
      expectedRelative: 1.85,
    },
    patterns: [
      /\b(dead\s*lift|deadlift|dl)\b/i,
      /\b(conventional\s*deadlift|conv\s*dl)\b/i,
      /\b(sumo\s*deadlift|sumo\s*dl)\b/i,
      /\b(trap\s*bar\s*deadlift|hex\s*bar\s*deadlift|trap\s*bar\s*dl|hex\s*dl)\b/i,
    ],
  },
  {
    profile: {
      id: "hinge-rdl-stiffleg-goodmorning",
      label: "Hinge (RDL/Stiff-Leg/Good Morning)",
      description: "Posterior-chain hinges without pulling from the floor.",
      expectedRelative: 1.45,
    },
    patterns: [
      /\b(rdl|romanian\s*dead\s*lift|romanian\s*deadlift)\b/i,
      /\b(stiff\s*leg\s*deadlift|stiff\s*legged\s*deadlift|sldl)\b/i,
      /\b(good\s*morning|gm)\b/i,
      /\b(block\s*pull|rack\s*pull|pin\s*pull)\b/i,
      /\b(jefferson\s*curl)\b/i,
    ],
  },
  {
    profile: {
      id: "split-unilateral-squat",
      label: "Unilateral/Split Squat",
      description: "Single-leg squat patterns (Bulgarian split squat, lunges, step-ups).",
      expectedRelative: 1.05,
    },
    patterns: [
      /\b(bulgarian\s*(split\s*squat|ss)|bss)\b/i,
      /\bsplit\s*squat\b/i,
      /\b(lunge|lunges|reverse\s*lunge|walking\s*lunge|forward\s*lunge|static\s*lunge)\b/i,
      /\b(step\s*up|stepup)\b/i,
      /\b(pistol\s*squat|shrimp\s*squat)\b/i,
    ],
  },
  {
    profile: {
      id: "hip-thrust-bridge",
      label: "Hip Thrust / Glute Bridge",
      description: "Horizontal hip extension patterns like hip thrusts and bridges.",
      expectedRelative: 1.3,
    },
    patterns: [
      /\b(hip\s*thrust|hipthrust)\b/i,
      /\b(glute\s*bridge|glute\s*bridges|bridge\s*press)\b/i,
      /\b(barbell\s*hip\s*thrust|bb\s*hip\s*thrust)\b/i,
      /\b(single\s*leg\s*hip\s*thrust|single\s*leg\s*glute\s*bridge)\b/i,
    ],
  },
  {
    profile: {
      id: "horizontal-press-bench",
      label: "Horizontal Press (Bench Variants)",
      description: "Bench press variations and horizontal pressing.",
      expectedRelative: 1.25,
    },
    patterns: [
      /\b(bench\s*press|bench)\b/i,
      /\b(close\s*grip\s*bench|cg\s*bench|cgbp)\b/i,
      /\b(incline\s*(bench|press)|incline\s*press)\b/i,
      /\b(decline\s*(bench|press)|decline\s*press)\b/i,
      /\b(db\s*bench|dumbbell\s*bench|db\s*press|dumbbell\s*press)\b/i,
      /\b(chest\s*press\s*machine|machine\s*chest\s*press)\b/i,
    ],
  },
  {
    profile: {
      id: "vertical-press-ohp",
      label: "Vertical Press (OHP Variants)",
      description: "Overhead pressing patterns (standing/seated).",
      expectedRelative: 0.85,
    },
    patterns: [
      /\b(ohp|overhead\s*press|overhead\s*barbell\s*press)\b/i,
      /\bmilitary\s*press\b/i,
      /\b(push\s*press|pp)\b/i,
      /\b(seated\s*overhead\s*press|seated\s*ohp)\b/i,
      /\b(db\s*shoulder\s*press|dumbbell\s*shoulder\s*press|db\s*ohp)\b/i,
      /\barnold\s*press\b/i,
    ],
  },
  {
    profile: {
      id: "dips-pushups-bodyweight-press",
      label: "Bodyweight Pressing (Dips/Push-ups)",
      description: "Bodyweight pressing such as dips and push-ups.",
      expectedRelative: 0.95,
    },
    patterns: [
      /\b(dip|dips|weighted\s*dip|ring\s*dip)\b/i,
      /\b(push\s*up|pushup|press\s*up)\b/i,
      /\b(weighted\s*push\s*up|weighted\s*pushup)\b/i,
      /\b(handstand\s*push\s*up|hspu)\b/i,
    ],
  },
  {
    profile: {
      id: "rows-horizontal-pull",
      label: "Rows (Horizontal Pull)",
      description: "Horizontal pulling movements for the back.",
      expectedRelative: 1.0,
    },
    patterns: [
      /\brow(s)?\b/i,
      /\b(barbell\s*row|bb\s*row|bent\s*over\s*row|pendlay)\b/i,
      /\b(dumbbell\s*row|db\s*row|one\s*arm\s*row|single\s*arm\s*row)\b/i,
      /\b(cable\s*row|seated\s*row|low\s*row)\b/i,
      /\b(chest\s*supported\s*row|t\s*bar\s*row|tbar\s*row)\b/i,
      /\b(machine\s*row|hammer\s*strength\s*row)\b/i,
    ],
  },
  {
    profile: {
      id: "vertical-pull-pullups-pulldown",
      label: "Vertical Pull (Pull-ups/Pulldown)",
      description: "Vertical pulling movements for lats.",
      expectedRelative: 0.9,
    },
    patterns: [
      /\b(pull\s*up|pullup|chin\s*up|chinup)\b/i,
      /\b(weighted\s*(pull\s*up|pullup|chin\s*up|chinup))\b/i,
      /\b(lat\s*pull\s*down|lat\s*pulldown|pull\s*down|pulldown)\b/i,
      /\b(neutral\s*grip\s*pull\s*up|neutral\s*grip\s*pulldown)\b/i,
      /\b(assisted\s*pull\s*up|assisted\s*pullup)\b/i,
    ],
  },
  {
    profile: {
      id: "olympic-lifts",
      label: "Olympic Lifts",
      description: "Clean, snatch, jerk variants with a catch.",
      expectedRelative: 1.05,
    },
    patterns: [
      /\b(clean\s*&\s*jerk|clean\s*and\s*jerk|c\s*&\s*j)\b/i,
      /\b(power\s*clean|hang\s*clean|clean)\b/i,
      /\b(snatch|power\s*snatch|hang\s*snatch)\b/i,
      /\b(jerk|push\s*jerk|split\s*jerk)\b/i,
    ],
  },
  {
    profile: {
      id: "olympic-derivatives-pulls",
      label: "Olympic Derivatives (Pulls)",
      description: "Olympic pulls and explosive derivatives without a catch.",
      expectedRelative: 1.25,
    },
    patterns: [
      /\b(clean\s*pull|snatch\s*pull)\b/i,
      /\b(high\s*pull|hang\s*high\s*pull)\b/i,
      /\b(mid\s*thigh\s*pull|pull\s*from\s*blocks)\b/i,
    ],
  },
  {
    profile: {
      id: "lower-machine-compound",
      label: "Lower Body Machine Compounds",
      description: "Compound lower-body machines like leg press and hack squat.",
      expectedRelative: 1.5,
    },
    patterns: [
      /\bleg\s*press\b/i,
      /\b(hack\s*squat\s*machine|machine\s*hack\s*squat)\b/i,
      /\b(smith\s*machine\s*squat|smith\s*squat)\b/i,
      /\b(v\s*squat|v-?squat|pendulum\s*squat)\b/i,
    ],
  },
  {
    profile: {
      id: "hamstring-posterior-accessory",
      label: "Posterior Chain Accessories",
      description: "Hamstring curls, GHRs, hypers, and related accessories.",
      expectedRelative: 0.75,
    },
    patterns: [
      /\b(hamstring\s*curl|leg\s*curl|lying\s*leg\s*curl|seated\s*leg\s*curl)\b/i,
      /\b(nordic\s*curl|nordic\s*hamstring)\b/i,
      /\b(glute\s*ham\s*raise|ghr)\b/i,
      /\b(back\s*extension|hyper\s*extension|reverse\s*hyper)\b/i,
      /\b(pull\s*through|cable\s*pull\s*through)\b/i,
    ],
  },
  {
    profile: {
      id: "quad-accessory-extension",
      label: "Quad Accessories (Extensions)",
      description: "Knee-extension isolation such as leg extensions and sissy squats.",
      expectedRelative: 0.65,
    },
    patterns: [
      /\b(leg\s*extension|quad\s*extension)\b/i,
      /\bsissy\s*squat\b/i,
    ],
  },
  {
    profile: {
      id: "calf-raises",
      label: "Calves",
      description: "Calf raise variations.",
      expectedRelative: 0.55,
    },
    patterns: [
      /\b(calf\s*raise|calf\s*raises)\b/i,
      /\b(seated\s*calf\s*raise|standing\s*calf\s*raise)\b/i,
      /\b(donkey\s*calf\s*raise)\b/i,
    ],
  },
  {
    profile: {
      id: "chest-flye-isolation",
      label: "Chest Isolation (Flyes)",
      description: "Chest fly and pec deck style movements.",
      expectedRelative: 0.6,
    },
    patterns: [
      /\b(fly|flye|flyes|fly\s*machine|pec\s*deck|pec\s*deck\s*fly)\b/i,
      /\b(cable\s*crossover|cable\s*fly|chest\s*fly)\b/i,
    ],
  },
  {
    profile: {
      id: "shoulder-isolation-lateral-raise",
      label: "Shoulder Isolation (Raises)",
      description: "Lateral, front, rear raises and face pulls.",
      expectedRelative: 0.5,
    },
    patterns: [
      /\b(lateral\s*raise|lat\s*raise|side\s*raise)\b/i,
      /\bfront\s*raise\b/i,
      /\b(rear\s*delt\s*raise|rear\s*raise|reverse\s*fly|reverse\s*flye)\b/i,
      /\bface\s*pull\b/i,
    ],
  },
  {
    profile: {
      id: "biceps-isolation",
      label: "Biceps Isolation",
      description: "Curl variations for elbow flexion.",
      expectedRelative: 0.5,
    },
    patterns: [
      /\b(curl|curls)\b/i,
      /\b(bicep\s*curl|biceps\s*curl)\b/i,
      /\b(hammer\s*curl|incline\s*curl|preacher\s*curl|spider\s*curl)\b/i,
      /\b(ez\s*bar\s*curl|ez\s*curl)\b/i,
      /\b(cable\s*curl|machine\s*curl)\b/i,
    ],
  },
  {
    profile: {
      id: "triceps-isolation",
      label: "Triceps Isolation",
      description: "Pushdowns, skull crushers, overhead extensions, kickbacks.",
      expectedRelative: 0.55,
    },
    patterns: [
      /\b(tricep|triceps)\b/i,
      /\b(push\s*down|pushdown|press\s*down|pressdown)\b/i,
      /\b(skull\s*crusher|skullcrusher|lying\s*triceps\s*extension)\b/i,
      /\b(overhead\s*triceps\s*extension|oh\s*extension)\b/i,
      /\b(triceps\s*kickback|kickback)\b/i,
    ],
  },
  {
    profile: {
      id: "upper-back-traps",
      label: "Traps/Upper Back",
      description: "Shrugs, upright rows, and high rows.",
      expectedRelative: 0.75,
    },
    patterns: [
      /\b(shrug|shrugs)\b/i,
      /\bupright\s*row\b/i,
      /\bhigh\s*row\b/i,
    ],
  },
  {
    profile: {
      id: "core-anti-movement",
      label: "Core (Anti-movement/Abs)",
      description: "Core stability and abdominal isolation.",
      expectedRelative: 0.4,
    },
    patterns: [
      /\b(plank|side\s*plank)\b/i,
      /\b(ab\s*wheel|roll\s*out|rollout)\b/i,
      /\b(crunch|sit\s*up|situp)\b/i,
      /\bpallof\s*press\b/i,
      /\b(hanging\s*leg\s*raise|leg\s*raise|toes\s*to\s*bar)\b/i,
    ],
  },
  {
    profile: {
      id: "carries-strongman",
      label: "Carries & Strongman Events",
      description: "Farmer’s walks, yoke carries, sled work, stone loads.",
      expectedRelative: 0.45,
    },
    patterns: [
      /\b(farmer'?s\s*(walk|carry)|farmers\s*walk|farmers\s*carry)\b/i,
      /\b(yoke\s*(walk|carry))\b/i,
      /\b(suitcase\s*carry|waiter\s*carry|overhead\s*carry)\b/i,
      /\b(sled\s*(push|pull)|prowler)\b/i,
      /\b(stone\s*load|atlas\s*stone)\b/i,
    ],
  },
  {
    profile: {
      id: "machines-cables-general",
      label: "Machines/Cables (General)",
      description: "General machine or cable compounds.",
      expectedRelative: 0.85,
    },
    patterns: [
      /\b(machine\s*press|machine\s*row|hammer\s*strength)\b/i,
      /\b(cable\s*(press|row|pulldown|pull\s*down))\b/i,
      /\b(smith\s*machine\s*(press|bench|ohp))\b/i,
    ],
  },
];

const defaultMovementProfile: MovementProfile = {
  id: "general",
  label: "Unclassified",
  description: "Fallback when no movement profile matches.",
  expectedRelative: 0.8,
};

function inferMovementProfile(name: string): MovementProfile {
  const cleaned = name?.toLowerCase() ?? "";
  for (const candidate of movementProfiles) {
    if (candidate.patterns.some((pattern) => pattern.test(cleaned))) {
      return candidate.profile;
    }
  }
  return defaultMovementProfile;
}

function collectExerciseEntries(days: WorkoutDay[]) {
  const entries: {
    date: string;
    weight: number;
    reps: number;
    ex: WorkoutExercise;
    profile: MovementProfile;
  }[] = [];
  for (const day of days) {
    for (const ex of day.exercises) {
      if (!ex.trackWeight) continue;
      const reps = parseRepsEstimate(ex.reps);
      for (const log of ex.logs) {
        if (!log?.date || !log?.weight) continue;
        const profile = inferMovementProfile(ex.name ?? "");
        entries.push({ date: log.date, weight: log.weight, reps, ex, profile });
      }
    }
  }
  return entries;
}

/**
 * Build a "relative strength index" time series:
 * - For each logged set, compute e1RM (Epley) from (weight, reps template)
 * - Normalize by bodyweight
 * - Aggregate per day by average across all available exercise entries
 */
export function computeStrengthSeries(params: {
  workoutDays: WorkoutDay[];
  units: Units;
  bodyweight: number | null;
  bodyweightUnits: Units;
  minDistinctDays?: number;
  minTotalEntries?: number;
}): StrengthSeriesResult {
  const {
    workoutDays,
    units,
    bodyweight,
    bodyweightUnits,
    minDistinctDays = 4,
    minTotalEntries = 8,
  } = params;

  if (!bodyweight || bodyweight <= 0) {
    return { series: [], distinctDays: 0, totalEntries: 0, ok: false, reason: "Add your bodyweight to enable strength tracking." };
  }

  const bwLbs = toLbs(bodyweight, bodyweightUnits);
  const raw = collectExerciseEntries(workoutDays);
  if (raw.length === 0) {
    return {
      series: [],
      distinctDays: 0,
      totalEntries: 0,
      ok: false,
      reason: "Log exercise weights (and enable weight tracking on exercises) to see your strength trend.",
    };
  }

  // group by date
  const byDate = new Map<string, number[]>();
  for (const entry of raw) {
    const wLbs = toLbs(entry.weight, units);
    const oneRm = estimate1RM(wLbs, entry.reps);
    const rel = oneRm / bwLbs;
    if (!Number.isFinite(rel) || rel <= 0) continue;
    const normalized = rel / Math.max(0.25, entry.profile.expectedRelative);
    const arr = byDate.get(entry.date) ?? [];
    arr.push(normalized);
    byDate.set(entry.date, arr);
  }

  const dates = Array.from(byDate.keys()).sort();
  const series: StrengthPoint[] = dates.map((date) => {
    const arr = byDate.get(date) ?? [];
    const avg = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    return { date, index: avg, entries: arr.length };
  });

  const distinctDays = series.length;
  const totalEntries = series.reduce((s, p) => s + p.entries, 0);

  if (distinctDays < minDistinctDays || totalEntries < minTotalEntries) {
    return {
      series,
      distinctDays,
      totalEntries,
      ok: false,
      reason: `Not enough data yet. Log weights on at least ${minDistinctDays} different days (and ideally ${minTotalEntries}+ total entries).`,
    };
  }

  const baselineWindow = series.slice(0, Math.min(3, series.length));
  const currentWindow = series.slice(Math.max(0, series.length - 3));
  const baseline = baselineWindow.reduce((a, b) => a + b.index, 0) / baselineWindow.length;
  const current = currentWindow.reduce((a, b) => a + b.index, 0) / currentWindow.length;
  const changePct = baseline > 0 ? ((current - baseline) / baseline) * 100 : undefined;

  return { series, distinctDays, totalEntries, baseline, current, changePct, ok: true };
}
