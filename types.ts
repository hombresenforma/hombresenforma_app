export interface ExerciseSet {
  serie: number;
  kg: string | number;
  reps: string | number;
  completionState: 'good' | 'bad' | 'neutral';
}

export interface WorkoutLogEntry {
  exerciseName: string;
  setsPerformed: ExerciseSet[];
  completionState: string;
  personalRecord?: string;
  date: string;
  time: string;
  rawDate: string;
  dayKey: string;
}

export interface SubExercise {
  name: string;
  reps: string;
  sets?: number;
  rest?: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  subOrder: number;
}

export interface Exercise {
  order: number;
  name: string;
  reps: string;
  sets?: number;
  rest?: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  // Superset/Circuit specific
  isSuperset?: boolean;
  isEMOM?: boolean;
  circuitDetails?: {
    totalRounds: number;
    restBetweenExercisesSeconds: string;
    restBetweenRoundsSeconds: string;
  };
  emomDetails?: {
    totalIntervals: number;
  };
  items?: SubExercise[];
}

export interface WorkoutDay {
  name: string;
  exercises: Exercise[];
}

export interface WorkoutData {
  [key: string]: WorkoutDay;
}

export interface UserConfig {
  exercises_data?: {
    activeWeeks?: 'all' | 'none' | 'even' | 'odd' | number[];
  };
}
