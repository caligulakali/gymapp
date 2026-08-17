import type { Template, TemplateExercise } from '../db/entities';

export type TemplateDraft = Omit<Template, 'id'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function validateTemplateExercise(value: unknown): string[] {
  if (!isRecord(value)) return ['Упражнение шаблона указано неверно'];
  if (!('exerciseId' in value) && !('order' in value) && !('sets' in value)) {
    return ['Упражнение шаблона указано неверно'];
  }
  const errors: string[] = [];
  if (typeof value.exerciseId !== 'string' || !value.exerciseId.trim()) {
    errors.push('Идентификатор упражнения не может быть пустым');
  }
  if (typeof value.order !== 'number' || !Number.isInteger(value.order)) {
    errors.push('Порядок упражнения должен быть целым числом');
  } else if (value.order < 0) {
    errors.push('Порядок упражнения не может быть отрицательным');
  }
  if (!isPositiveInteger(value.sets)) {
    errors.push('Количество подходов должно быть положительным целым числом');
  }
  if (typeof value.targetReps !== 'undefined') {
    if (typeof value.targetReps !== 'number' || !Number.isInteger(value.targetReps) || value.targetReps === 0) {
      errors.push('Целевые повторения должны быть положительным целым числом');
    } else if (value.targetReps < 0) {
      errors.push('Целевые повторения не могут быть отрицательными');
    }
  }
  if (typeof value.targetWeight !== 'undefined') {
    if (typeof value.targetWeight !== 'number' || !Number.isFinite(value.targetWeight)) {
      errors.push('Целевой вес должен быть числом');
    } else if (value.targetWeight < 0) {
      errors.push('Целевой вес не может быть отрицательным');
    }
  }
  return errors;
}

export function validateTemplateDraft(draft: TemplateDraft): string[] {
  const candidate = draft as unknown as { name: unknown; notes?: unknown; exercises: unknown };
  const errors: string[] = [];
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    errors.push('Название шаблона не может быть пустым');
  }
  if (typeof candidate.notes !== 'undefined' && typeof candidate.notes !== 'string') {
    errors.push('Заметка шаблона указана неверно');
  }
  if (!Array.isArray(candidate.exercises)) {
    errors.push('Список упражнений указан неверно');
    return errors;
  }
  if (candidate.exercises.length === 0) {
    errors.push('В шаблоне должно быть хотя бы одно упражнение');
  }
  for (const exercise of candidate.exercises) errors.push(...validateTemplateExercise(exercise));
  return errors;
}

export function createTemplate(draft: TemplateDraft, id: string): Template {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Идентификатор шаблона не может быть пустым');
  }
  const errors = validateTemplateDraft(draft);
  if (errors.length > 0) throw new Error(errors[0]);
  return {
    id: id.trim(),
    name: draft.name.trim(),
    notes: typeof draft.notes === 'string' ? draft.notes.trim() || undefined : undefined,
    exercises: draft.exercises.map((exercise): TemplateExercise => ({
      ...exercise,
      exerciseId: exercise.exerciseId.trim()
    }))
  };
}
