import type { Equipment, Exercise, ExerciseType, WeightUnit } from '../db/entities';
import { MUSCLE_GROUPS } from './muscle-groups';

export type ExerciseDraft = Omit<Exercise, 'id' | 'favourite'>;

const EXERCISE_TYPES: readonly ExerciseType[] = ['strength', 'cardio', 'time', 'reps'];
const WEIGHT_UNITS: readonly WeightUnit[] = ['kg'];
export const EQUIPMENT_OPTIONS: readonly { value: Equipment; label: string; shortLabel: string }[] = [
  { value: 'bodyweight', label: 'Свой вес', shortLabel: 'Свой вес' },
  { value: 'dumbbells', label: 'Гантели', shortLabel: 'Гантели' },
  { value: 'barbell', label: 'Штанга', shortLabel: 'Штанга' },
  { value: 'machine', label: 'Тренажёр', shortLabel: 'Тренажёр' },
  { value: 'cable', label: 'Блочный тренажёр', shortLabel: 'Блок' },
  { value: 'kettlebell', label: 'Гиря', shortLabel: 'Гиря' },
  { value: 'other', label: 'Другое', shortLabel: 'Другое' }
];
const EQUIPMENT_TYPES = EQUIPMENT_OPTIONS.map(({ value }) => value);

export function getEquipmentLabel(equipment?: Equipment): string {
  return EQUIPMENT_OPTIONS.find(({ value }) => value === equipment)?.shortLabel ?? 'Другое';
}

function isValue<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

export function validateExerciseDraft(draft: ExerciseDraft): string[] {
  const candidate = draft as unknown as {
    name: unknown;
    equipment: unknown;
    muscleGroup: unknown;
    type: unknown;
    unit: unknown;
    notes?: unknown;
  };
  const errors: string[] = [];
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    errors.push('Название упражнения не может быть пустым');
  }
  if (typeof candidate.notes !== 'undefined' && typeof candidate.notes !== 'string') {
    errors.push('Заметка упражнения указана неверно');
  }
  if (typeof candidate.equipment !== 'string' || !isValue(candidate.equipment, EQUIPMENT_TYPES)) {
    errors.push('Снаряд указан неверно');
  }
  if (typeof candidate.muscleGroup !== 'string' || !isValue(candidate.muscleGroup, MUSCLE_GROUPS)) {
    errors.push('Мышечная группа указана неверно');
  }
  if (typeof candidate.type !== 'string' || !isValue(candidate.type, EXERCISE_TYPES)) {
    errors.push('Тип упражнения указан неверно');
  }
  if (typeof candidate.unit !== 'string' || !isValue(candidate.unit, WEIGHT_UNITS)) {
    errors.push('Единица веса указана неверно');
  }
  return errors;
}

export function createExercise(draft: ExerciseDraft, id: string): Exercise {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Идентификатор упражнения не может быть пустым');
  }
  const errors = validateExerciseDraft(draft);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return {
    id: id.trim(),
    name: draft.name.trim(),
    equipment: draft.equipment,
    muscleGroup: draft.muscleGroup,
    type: draft.type,
    unit: draft.unit,
    notes: typeof draft.notes === 'string' ? draft.notes.trim() || undefined : undefined,
    favourite: false
  };
}
