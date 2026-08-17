import { describe, expect, it } from 'vitest';
import { createTemplate, validateTemplateDraft } from '../../src/domain/template-service';

const draft = {
  name: '  Ноги  ',
  notes: '  Тяжёлая тренировка  ',
  exercises: [
    { exerciseId: 'exercise-1', order: 0, sets: 4, targetReps: 8, targetWeight: 100 }
  ]
};

describe('template service', () => {
  it('normalizes template text and nested exercise references', () => {
    expect(createTemplate({
      ...draft,
      exercises: [{ ...draft.exercises[0], exerciseId: ' exercise-1 ' }]
    }, 'template-1')).toEqual({
      id: 'template-1',
      name: 'Ноги',
      notes: 'Тяжёлая тренировка',
      exercises: [{ ...draft.exercises[0], exerciseId: 'exercise-1' }]
    });
  });

  it('rejects an empty name and an empty exercise list', () => {
    expect(validateTemplateDraft({ ...draft, name: '   ' })).toContain(
      'Название шаблона не может быть пустым'
    );
    expect(validateTemplateDraft({ ...draft, exercises: [] })).toContain(
      'В шаблоне должно быть хотя бы одно упражнение'
    );
  });

  it('rejects invalid set targets and empty identifiers', () => {
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], sets: 0 }]
    })).toContain('Количество подходов должно быть положительным целым числом');
    expect(() => createTemplate(draft, '  ')).toThrow(
      'Идентификатор шаблона не может быть пустым'
    );
    expect(() => createTemplate(draft, null as never)).toThrow(
      'Идентификатор шаблона не может быть пустым'
    );
    expect(() => createTemplate(draft, 42 as never)).toThrow(
      'Идентификатор шаблона не может быть пустым'
    );
    expect(() => createTemplate(draft, {} as never)).toThrow(
      'Идентификатор шаблона не может быть пустым'
    );
  });

  it('accepts a fractional target weight', () => {
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], targetWeight: 12.5 }]
    })).toEqual([]);
  });

  it('returns errors for malformed runtime values', () => {
    expect(validateTemplateDraft({ ...draft, name: null as never })).toContain(
      'Название шаблона не может быть пустым'
    );
    expect(validateTemplateDraft({ ...draft, name: {} as never })).toContain(
      'Название шаблона не может быть пустым'
    );
    expect(validateTemplateDraft({ ...draft, name: 42 as never })).toContain(
      'Название шаблона не может быть пустым'
    );
    expect(validateTemplateDraft({ ...draft, exercises: null as never })).toContain(
      'Список упражнений указан неверно'
    );
    expect(validateTemplateDraft({ ...draft, exercises: {} as never })).toContain(
      'Список упражнений указан неверно'
    );
    expect(validateTemplateDraft({ ...draft, exercises: 42 as never })).toContain(
      'Список упражнений указан неверно'
    );
    expect(validateTemplateDraft({ ...draft, exercises: [null as never] })).toContain(
      'Упражнение шаблона указано неверно'
    );
    expect(validateTemplateDraft({ ...draft, exercises: [{} as never] })).toContain(
      'Упражнение шаблона указано неверно'
    );
    expect(validateTemplateDraft({ ...draft, exercises: [42 as never] })).toContain(
      'Упражнение шаблона указано неверно'
    );
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], exerciseId: null as never }]
    })).toContain('Идентификатор упражнения не может быть пустым');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], exerciseId: {} as never }]
    })).toContain('Идентификатор упражнения не может быть пустым');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], exerciseId: '  ' }]
    })).toContain('Идентификатор упражнения не может быть пустым');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{
        ...draft.exercises[0],
        exerciseId: 42 as never,
        order: 1.5,
        sets: '4' as never,
        targetReps: '8' as never,
        targetWeight: '100' as never
      }]
    })).toEqual(expect.arrayContaining([
      'Идентификатор упражнения не может быть пустым',
      'Порядок упражнения должен быть целым числом',
      'Количество подходов должно быть положительным целым числом',
      'Целевые повторения должны быть положительным целым числом',
      'Целевой вес должен быть числом'
    ]));
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], order: -1, targetWeight: -10 }]
    })).toEqual(expect.arrayContaining([
      'Порядок упражнения не может быть отрицательным',
      'Целевой вес не может быть отрицательным'
    ]));
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], order: 0.5 }]
    })).toContain('Порядок упражнения должен быть целым числом');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], targetReps: 4.5 }]
    })).toContain('Целевые повторения должны быть положительным целым числом');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], targetReps: -1 }]
    })).toContain('Целевые повторения не могут быть отрицательными');
    expect(validateTemplateDraft({
      ...draft,
      exercises: [{ ...draft.exercises[0], targetWeight: '100' as never }]
    })).toContain('Целевой вес должен быть числом');
  });
});
