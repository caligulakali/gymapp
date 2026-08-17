import { describe, expect, it } from 'vitest';
import { createWorkout, createWorkoutFromTemplate, validateWorkoutDraft } from '../../src/domain/workout-service';

const template = {
  id: 'template-legs',
  name: 'Ноги',
  notes: 'Тяжёлый день',
  exercises: [
    { exerciseId: 'squat', order: 0, sets: 3, targetReps: 8, targetWeight: 100 },
    { exerciseId: 'lunge', order: 1, sets: 2, targetReps: 10 }
  ]
};

describe('workout service', () => {
  it('starts a workout from a template with independent prefilled sets', () => {
    const workout = createWorkoutFromTemplate(template, 'workout-1', '2026-08-17T12:00:00.000Z');

    expect(workout).toEqual({
      id: 'workout-1',
      templateId: 'template-legs',
      date: '2026-08-17T12:00:00.000Z',
      exercises: [
        {
          exerciseId: 'squat',
          order: 0,
          sets: [
            { reps: 8, weight: 100 },
            { reps: 8, weight: 100 },
            { reps: 8, weight: 100 }
          ]
        },
        {
          exerciseId: 'lunge',
          order: 1,
          sets: [{ reps: 10 }, { reps: 10 }]
        }
      ]
    });

    workout.exercises[0].sets[0].weight = 110;
    expect(workout.exercises[0].sets[1].weight).toBe(100);
  });

  it('preserves zero target weight and supports templates without targets', () => {
    const workout = createWorkoutFromTemplate({
      ...template,
      exercises: [
        { exerciseId: 'deadlift', order: 0, sets: 1, targetWeight: 0 },
        { exerciseId: 'plank', order: 1, sets: 1 }
      ]
    }, 'workout-1', '2026-08-17T12:00:00.000Z');

    expect(workout.exercises).toEqual([
      { exerciseId: 'deadlift', order: 0, sets: [{ weight: 0 }] },
      { exerciseId: 'plank', order: 1, sets: [{}] }
    ]);
  });

  it('starts a genuinely empty workout manually', () => {
    expect(createWorkout({
      date: '2026-08-17T12:00:00.000Z',
      exercises: []
    }, 'workout-empty')).toEqual({
      id: 'workout-empty',
      date: '2026-08-17T12:00:00.000Z',
      exercises: []
    });
  });

  it('creates a normalized manual workout with recorded sets', () => {
    expect(createWorkout({
      date: '2026-08-17T12:00:00.000Z',
      notes: '  Кардио  ',
      exercises: [{ exerciseId: 'run', order: 0, sets: [{ time: 900, distance: 2.5 }] }]
    }, 'workout-2')).toEqual({
      id: 'workout-2',
      date: '2026-08-17T12:00:00.000Z',
      notes: 'Кардио',
      exercises: [{ exerciseId: 'run', order: 0, sets: [{ time: 900, distance: 2.5 }] }]
    });
  });

  it('validates recorded set values and workout structure', () => {
    const validDraft = {
      date: '2026-08-17T12:00:00.000Z',
      notes: '  Хорошая тренировка  ',
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8, weight: 100, rest: 120, time: 60, distance: 1.5 }] }]
    };

    expect(validateWorkoutDraft(validDraft)).toEqual([]);
    expect(validateWorkoutDraft({ ...validDraft, date: 'tomorrow' })).toContain(
      'Дата тренировки должна быть корректной ISO-датой'
    );
    expect(validateWorkoutDraft({ ...validDraft, date: '2026-08-17T12:00:00' })).toContain(
      'Дата тренировки должна быть корректной ISO-датой'
    );
    expect(validateWorkoutDraft({ ...validDraft, exercises: [] })).toEqual([]);
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 0, weight: -1, rest: -10, time: 0.5, distance: -1 }] }]
    })).toEqual(expect.arrayContaining([
      'Количество повторений должно быть положительным целым числом',
      'Вес подхода не может быть отрицательным',
      'Отдых должен быть положительным целым числом',
      'Время должно быть положительным целым числом',
      'Расстояние не может быть отрицательным'
    ]));
  });

  it('rejects malformed runtime workout values', () => {
    const validDraft = {
      date: '2026-08-17T12:00:00.000Z',
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8 }] }]
    };

    expect(validateWorkoutDraft(null as never)).toContain('Тренировка указана неверно');
    expect(validateWorkoutDraft('workout' as never)).toContain('Тренировка указана неверно');
    expect(validateWorkoutDraft(42 as never)).toContain('Тренировка указана неверно');
    expect(validateWorkoutDraft({ ...validDraft, exercises: null as never })).toContain('Список упражнений указан неверно');
    expect(validateWorkoutDraft({ ...validDraft, exercises: [{}] as never })).toContain('Упражнение тренировки указано неверно');
    expect(validateWorkoutDraft({ ...validDraft, exercises: [{ exerciseId: ' ', order: -0.5, sets: [] }] })).toEqual(expect.arrayContaining([
      'Идентификатор упражнения не может быть пустым',
      'Порядок упражнения должен быть целым неотрицательным числом',
      'В упражнении должен быть хотя бы один подход'
    ]));
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: [null as never] }]
    })).toContain('Подход указан неверно');
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: null as never }]
    })).toContain('Список подходов указан неверно');
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{
        reps: Number.NaN,
        weight: Number.POSITIVE_INFINITY,
        rest: Number.NaN,
        time: Number.POSITIVE_INFINITY,
        distance: Number.NaN
      }] }]
    })).toEqual(expect.arrayContaining([
      'Количество повторений должно быть положительным целым числом',
      'Вес подхода должен быть числом',
      'Отдых должен быть положительным целым числом',
      'Время должно быть положительным целым числом',
      'Расстояние должно быть числом'
    ]));
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ rest: Number.POSITIVE_INFINITY }] }]
    })).toContain('Отдых должен быть положительным целым числом');
    expect(validateWorkoutDraft({
      ...validDraft,
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ distance: Number.POSITIVE_INFINITY }] }]
    })).toContain('Расстояние должно быть числом');
  });

  it('rejects malformed template and identifier inputs', () => {
    expect(() => createWorkoutFromTemplate(template, '  ', '2026-08-17T12:00:00.000Z')).toThrow(
      'Идентификатор тренировки не может быть пустым'
    );
    expect(() => createWorkoutFromTemplate({ ...template, exercises: [] }, 'workout-1', '2026-08-17T12:00:00.000Z')).toThrow(
      'В шаблоне должно быть хотя бы одно упражнение'
    );
    expect(() => createWorkoutFromTemplate(template, 'workout-1', 'invalid')).toThrow(
      'Дата тренировки должна быть корректной ISO-датой'
    );
    expect(() => createWorkoutFromTemplate({ ...template, exercises: null as never }, 'workout-1', '2026-08-17T12:00:00.000Z')).toThrow(
      'Список упражнений шаблона указан неверно'
    );
    expect(() => createWorkoutFromTemplate({
      ...template,
      exercises: [{ exerciseId: ' ', order: 0.5, sets: 0 }]
    }, 'workout-1', '2026-08-17T12:00:00.000Z')).toThrow(
      'Идентификатор упражнения не может быть пустым'
    );
    expect(() => createWorkoutFromTemplate({
      ...template,
      exercises: [{ exerciseId: 'squat', order: 0.5, sets: 3 }]
    }, 'workout-1', '2026-08-17T12:00:00.000Z')).toThrow(
      'Порядок упражнения должен быть целым неотрицательным числом'
    );
    expect(() => createWorkoutFromTemplate({
      ...template,
      exercises: [{ exerciseId: 'squat', order: 0, sets: 0 }]
    }, 'workout-1', '2026-08-17T12:00:00.000Z')).toThrow(
      'Количество подходов должно быть положительным целым числом'
    );
  });
});
