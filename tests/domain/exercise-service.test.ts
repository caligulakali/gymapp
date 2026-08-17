import { describe, expect, it } from 'vitest';
import { createExercise, validateExerciseDraft } from '../../src/domain/exercise-service';

const draft = {
  name: '  Жим лёжа  ',
  muscleGroup: 'chest' as const,
  type: 'strength' as const,
  unit: 'kg' as const,
  notes: '  Рабочий вес  '
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
  });

  it('normalizes user text and creates a stable exercise entity', () => {
    const first = createExercise(draft, 'exercise-1');
    const second = createExercise(draft, 'exercise-1');

    expect(first).toEqual({
      id: 'exercise-1',
      name: 'Жим лёжа',
      muscleGroup: 'chest',
      type: 'strength',
      unit: 'kg',
      notes: 'Рабочий вес',
      favourite: false
    });
    expect(second).toEqual(first);
  });

  it('rejects invalid drafts before persistence', () => {
    expect(() => createExercise({ ...draft, name: ' ' }, 'exercise-1')).toThrow(
      'Название упражнения не может быть пустым'
    );
  });
});
