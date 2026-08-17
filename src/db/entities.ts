export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio';
export type ExerciseType = 'strength' | 'cardio' | 'time' | 'reps';
export type WeightUnit = 'kg' | 'lb';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  unit: WeightUnit;
  notes?: string;
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
