export type CategoryKind = 'productive' | 'neutral' | 'waste';

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  kind: CategoryKind;
  is_archived: boolean;
  is_default: boolean;
  created_at: string;
}

export interface CategoryPreset {
  name: string;
  color: string;
  icon: string;
  kind: CategoryKind;
}

export interface CategoryDetail {
  id: number;
  name: string;
  color: string;
  icon: string;
  kind: CategoryKind;
}

export interface TimeEntry {
  id: number;
  date: string;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  end_time: string;
  category: number | null;
  category_detail: CategoryDetail | null;
  note: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

/** A row in the Day page editor (may be unsaved / empty). */
export interface EntryDraft {
  id?: number;
  start_time: string;
  end_time: string;
  category: number | null;
  note: string;
}

export interface StatsResponse {
  range: { from: string; to: string; days: number };
  totals: {
    minutes: number;
    productive: number;
    neutral: number;
    waste: number;
    productivity_index: number;
    filled_days: number;
    avg_minutes_per_day: number;
    avg_wake_time: string | null;
    avg_sleep_time: string | null;
    avg_sleep_minutes: number | null;
    goal: number;
    goal_days: number;
    current_streak: number;
  };
  by_category: Array<{
    id: number;
    name: string;
    color: string;
    icon: string;
    kind: CategoryKind;
    minutes: number;
  }>;
  by_kind: Array<{ kind: CategoryKind; minutes: number }>;
  by_day: Array<Record<string, string | number>>;
  trend: Array<{
    date: string;
    productive: number;
    neutral: number;
    waste: number;
    total: number;
    index: number;
  }>;
  prod_hours: Array<{ hour: number; minutes: number }>;
}

export interface DayLog {
  date: string;
  wake_time: string | null;
  sleep_time: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

// --- Workouts ---
export type Tracking = 'weight_reps' | 'bodyweight' | 'duration' | 'distance';

export interface Exercise {
  id: number;
  name: string;
  region: string;
  region_label: string;
  primary_muscle: string;
  muscle_label: string;
  tracking: Tracking;
  is_archived: boolean;
  is_default: boolean;
}

export interface MuscleNode {
  muscle: string;
  muscle_label: string;
}

export interface RegionNode {
  region: string;
  region_label: string;
  color: string;
  muscles: MuscleNode[];
}

export interface WorkoutSet {
  id?: number;
  order: number;
  reps: number | null;
  weight: string | null;
  duration_seconds: number | null;
  distance_km: string | null;
  done: boolean;
  volume?: number;
}

export interface WorkoutExercise {
  id?: number;
  exercise: number;
  exercise_detail?: Exercise;
  order: number;
  sets: WorkoutSet[];
}

export interface WorkoutTotals {
  exercises: number;
  sets: number;
  reps: number;
  volume: number;
  duration_seconds: number;
  distance_km: number;
}

export interface Workout {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string;
  duration_minutes: number | null;
  exercises: WorkoutExercise[];
  totals: WorkoutTotals;
  created_at: string;
  updated_at: string;
}

/** Payload sent when creating/updating a workout (no server-computed fields). */
export interface WorkoutInput {
  date: string;
  start_time: string | null;
  end_time: string | null;
  note: string;
  exercises: Array<{
    exercise: number;
    order: number;
    sets: Array<{
      order: number;
      reps: number | null;
      weight: string | null;
      duration_seconds: number | null;
      distance_km: string | null;
      done: boolean;
    }>;
  }>;
}
