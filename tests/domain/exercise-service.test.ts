import { describe, expect, it } from 'vitest';
import { createExercise, validateExerciseDraft } from '../../src/domain/exercise-service';

const draft = {
  name: '  Жим лёжа  ',
  equipment: 'barbell' as const,
  muscleGroup: 'chest' as const,
  type: 'strength' as const,
  unit: 'kg' as const,
  notes: '  Рабочий вес  ',
  restSeconds: 90
};

describe('exercise service', () => {
  it('validates required exercise fields', () => {
    expect(validateExerciseDraft({ ...draft, name: '   ' })).toEqual([
      'Название упражнения не может быть пустым'
    ]);
  });

  it('rejects invalid runtime enum values', () => {
    expect(validateExerciseDraft({ ...draft, muscleGroup: 'unknown' as never })).toContain(
      'Мышечная группа указана неверно'
    );
    expect(validateExerciseDraft({ ...draft, type: 'unknown' as never })).toContain(
      'Тип упражнения указан неверно'
    );
    expect(validateExerciseDraft({ ...draft, unit: 'unknown' as never })).toContain(
      'Единица веса указана неверно'
    );
    expect(validateExerciseDraft({ ...draft, equipment: 'unknown' as never })).toContain(
      'Снаряд указан неверно'
    );
  });

  it('returns validation errors for malformed text values', () => {
    expect(validateExerciseDraft({ ...draft, name: null as never })).toContain(
      'Название упражнения не может быть пустым'
    );
    expect(validateExerciseDraft({ ...draft, notes: 42 as never })).toContain(
      'Заметка упражнения указана неверно'
    );
  });

  it.each([0, -1, 1.5, 3601, Number.MAX_SAFE_INTEGER + 1, 1e308, Number.NaN, Number.POSITIVE_INFINITY, '90'])('rejects an invalid optional rest duration: %s', (restSeconds) => {
    expect(validateExerciseDraft({ ...draft, restSeconds: restSeconds as never })).toContain(
      'Время отдыха должно быть целым числом от 1 до 3600 секунд'
    );
  });

  it('keeps the rest duration optional', () => {
    expect(createExercise({ ...draft, restSeconds: undefined }, 'exercise-1').restSeconds).toBeUndefined();
  });

  it('accepts detailed muscle subgroups', () => {
    expect(validateExerciseDraft({ ...draft, muscleGroup: 'arms_biceps' })).toEqual([]);
    expect(createExercise({ ...draft, muscleGroup: 'arms_biceps' }, 'exercise-1').muscleGroup)
      .toBe('arms_biceps');
  });

  it('accepts legacy broad muscle groups', () => {
    expect(validateExerciseDraft({ ...draft, muscleGroup: 'arms' })).toEqual([]);
  });

  it('rejects unknown muscle subgroups', () => {
    expect(validateExerciseDraft({ ...draft, muscleGroup: 'arms_bicepsx' as never })).toContain(
      'Мышечная группа указана неверно'
    );
  });

  it('normalizes user text and creates a stable exercise entity', () => {
    const first = createExercise(draft, 'exercise-1');
    const second = createExercise(draft, 'exercise-1');

    expect(first).toEqual({
      id: 'exercise-1',
      name: 'Жим лёжа',
      equipment: 'barbell',
      muscleGroup: 'chest',
      type: 'strength',
      unit: 'kg',
      notes: 'Рабочий вес',
      restSeconds: 90,
      favourite: false
    });
    expect(second).toEqual(first);
  });

  it('rejects invalid drafts before persistence', () => {
    expect(() => createExercise({ ...draft, name: ' ' }, 'exercise-1')).toThrow(
      'Название упражнения не может быть пустым'
    );
  });

  it('rejects an empty stable identifier', () => {
    expect(() => createExercise(draft, '  ')).toThrow(
      'Идентификатор упражнения не может быть пустым'
    );
  });
});
