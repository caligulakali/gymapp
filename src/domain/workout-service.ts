import type { Template, Workout, WorkoutExercise, WorkoutSet } from '../db/entities';

export type WorkoutDraft = Omit<Workout, 'id'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isIsoUtc(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  return new Date(value).toISOString() === value;
}

function validateSet(value: unknown): string[] {
  if (!isRecord(value)) return ['Подход указан неверно'];
  const errors: string[] = [];
  if (typeof value.reps !== 'undefined' && !isPositiveInteger(value.reps)) {
    errors.push('Количество повторений должно быть положительным целым числом');
  }
  if (typeof value.weight !== 'undefined') {
    if (typeof value.weight !== 'number' || !Number.isFinite(value.weight)) errors.push('Вес подхода должен быть числом');
    else if (value.weight < 0) errors.push('Вес подхода не может быть отрицательным');
  }
  if (typeof value.rest !== 'undefined' && !isPositiveInteger(value.rest)) {
    errors.push('Отдых должен быть положительным целым числом');
  }
  if (typeof value.time !== 'undefined' && !isPositiveInteger(value.time)) {
    errors.push('Время должно быть положительным целым числом');
  }
  if (typeof value.distance !== 'undefined') {
    if (typeof value.distance !== 'number' || !Number.isFinite(value.distance)) errors.push('Расстояние должно быть числом');
    else if (value.distance < 0) errors.push('Расстояние не может быть отрицательным');
  }
  if (typeof value.completed !== 'undefined' && typeof value.completed !== 'boolean') {
    errors.push('Отметка выполнения подхода указана неверно');
  }
  return errors;
}

function validateWorkoutExercise(value: unknown): string[] {
  if (!isRecord(value)) return ['Упражнение тренировки указано неверно'];
  if (!('exerciseId' in value) && !('order' in value) && !('sets' in value)) {
    return ['Упражнение тренировки указано неверно'];
  }
  const errors: string[] = [];
  if (typeof value.exerciseId !== 'string' || !value.exerciseId.trim()) errors.push('Идентификатор упражнения не может быть пустым');
  if (!isNonNegativeInteger(value.order)) errors.push('Порядок упражнения должен быть целым неотрицательным числом');
  if (!Array.isArray(value.sets)) {
    errors.push('Список подходов указан неверно');
    return errors;
  }
  if (value.sets.length === 0) errors.push('В упражнении должен быть хотя бы один подход');
  for (const set of value.sets) errors.push(...validateSet(set));
  return errors;
}

function validateTemplateForWorkout(template: unknown): string[] {
  if (!isRecord(template) || !Array.isArray(template.exercises)) return ['Список упражнений шаблона указан неверно'];
  if (template.exercises.length === 0) return ['В шаблоне должно быть хотя бы одно упражнение'];
  const errors: string[] = [];
  for (const exercise of template.exercises) {
    if (!isRecord(exercise)) {
      errors.push('Упражнение шаблона указано неверно');
      continue;
    }
    if (typeof exercise.exerciseId !== 'string' || !exercise.exerciseId.trim()) errors.push('Идентификатор упражнения не может быть пустым');
    if (!isNonNegativeInteger(exercise.order)) errors.push('Порядок упражнения должен быть целым неотрицательным числом');
    if (!isPositiveInteger(exercise.sets)) errors.push('Количество подходов должно быть положительным целым числом');
  }
  return errors;
}

export function validateWorkoutDraft(draft: WorkoutDraft): string[] {
  if (!isRecord(draft)) return ['Тренировка указана неверно'];
  const errors: string[] = [];
  if (!isIsoUtc(draft.date)) errors.push('Дата тренировки должна быть корректной ISO-датой');
  if (typeof draft.notes !== 'undefined' && typeof draft.notes !== 'string') errors.push('Заметка тренировки указана неверно');
  if (!Array.isArray(draft.exercises)) return [...errors, 'Список упражнений указан неверно'];
  for (const exercise of draft.exercises) errors.push(...validateWorkoutExercise(exercise));
  return errors;
}

export function createWorkout(draft: WorkoutDraft, id: string): Workout {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Идентификатор тренировки не может быть пустым');
  const errors = validateWorkoutDraft(draft);
  if (errors.length > 0) throw new Error(errors[0]);
  return {
    id: id.trim(),
    ...(draft.templateId ? { templateId: draft.templateId } : {}),
    date: draft.date,
    ...(draft.notes?.trim() ? { notes: draft.notes.trim() } : {}),
    exercises: draft.exercises.map((exercise): WorkoutExercise => ({
      exerciseId: exercise.exerciseId.trim(),
      order: exercise.order,
      sets: exercise.sets.map((set): WorkoutSet => ({ ...set }))
    }))
  };
}

export function createWorkoutFromTemplate(template: Template, id: string, date: string): Workout {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Идентификатор тренировки не может быть пустым');
  if (!isIsoUtc(date)) throw new Error('Дата тренировки должна быть корректной ISO-датой');
  const errors = validateTemplateForWorkout(template);
  if (errors.length > 0) throw new Error(errors[0]);
  return createWorkout({
    templateId: template.id,
    date,
    exercises: template.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      order: exercise.order,
      sets: Array.from({ length: exercise.sets }, () => ({
        ...(typeof exercise.targetReps === 'number' ? { reps: exercise.targetReps } : {}),
        ...(typeof exercise.targetWeight === 'number' ? { weight: exercise.targetWeight } : {})
      }))
    }))
  }, id);
}
