import type { Exercise, ExerciseType, MuscleGroup, WeightUnit } from '../db/entities';

export type ExerciseDraft = Omit<Exercise, 'id' | 'favourite'>;

const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'abs',
  'cardio'
];
const EXERCISE_TYPES: readonly ExerciseType[] = ['strength', 'cardio', 'time', 'reps'];
const WEIGHT_UNITS: readonly WeightUnit[] = ['kg', 'lb'];

function isValue<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

export function validateExerciseDraft(draft: ExerciseDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) {
    errors.push('Название упражнения не может быть пустым');
  }
  if (!isValue(draft.muscleGroup, MUSCLE_GROUPS)) {
    errors.push('Мышечная группа указана неверно');
  }
  if (!isValue(draft.type, EXERCISE_TYPES)) {
    errors.push('Тип упражнения указан неверно');
  }
  if (!isValue(draft.unit, WEIGHT_UNITS)) {
    errors.push('Единица веса указана неверно');
  }
  return errors;
}

export function createExercise(draft: ExerciseDraft, id: string): Exercise {
  const errors = validateExerciseDraft(draft);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return {
    id,
    name: draft.name.trim(),
    muscleGroup: draft.muscleGroup,
    type: draft.type,
    unit: draft.unit,
    notes: draft.notes?.trim() || undefined,
    favourite: false
  };
}
