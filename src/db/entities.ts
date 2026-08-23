export type MuscleCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio';

export type MuscleGroup =
  | 'chest' | 'chest_upper' | 'chest_mid' | 'chest_lower'
  | 'back' | 'back_lats' | 'back_upper' | 'back_lower' | 'back_traps'
  | 'legs' | 'legs_quads' | 'legs_hamstrings' | 'legs_glutes' | 'legs_calves'
  | 'shoulders' | 'shoulders_front' | 'shoulders_side' | 'shoulders_rear'
  | 'arms' | 'arms_biceps' | 'arms_triceps' | 'arms_brachialis' | 'arms_forearms'
  | 'abs' | 'abs_upper' | 'abs_lower' | 'abs_obliques'
  | 'cardio';
export type ExerciseType = 'strength' | 'cardio' | 'time' | 'reps';
export type WeightUnit = 'kg';
export type Equipment = 'bodyweight' | 'dumbbells' | 'barbell' | 'machine' | 'cable' | 'kettlebell' | 'other';

export interface Exercise {
  id: string;
  name: string;
  equipment?: Equipment;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  unit: WeightUnit;
  notes?: string;
  restSeconds?: number;
  favourite: boolean;
}

export interface TemplateExercise {
  exerciseId: string;
  order: number;
  sets: number;
  targetReps?: number;
  targetWeight?: number;
}

export interface Template {
  id: string;
  name: string;
  notes?: string;
  exercises: TemplateExercise[];
}

export interface WorkoutSet {
  weight?: number;
  reps?: number;
  time?: number;
  distance?: number;
  rest?: number;
  completed?: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  order: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  templateId?: string;
  date: string;
  notes?: string;
  exercises: WorkoutExercise[];
}
