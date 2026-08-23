import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Template } from '../../src/db/entities';
import { WorkoutPage } from '../../src/ui/workouts/workout-page';

const exercise: Exercise = {
  id: 'exercise-1', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false
};
const secondExercise: Exercise = {
  id: 'exercise-2', name: 'Жим лёжа', muscleGroup: 'chest', type: 'strength', unit: 'kg', favourite: false
};
const template: Template = {
  id: 'template-1', name: 'Ноги', exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 2, targetReps: 8, targetWeight: 100 }]
};

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkoutPage', () => {
  it('keeps one exercise in focus without losing collapsed values', async () => {
    const focusedTemplate: Template = {
      ...template,
      exercises: [
        { exerciseId: 'exercise-1', order: 0, sets: 1, targetReps: 8, targetWeight: 100 },
        { exerciseId: 'exercise-2', order: 1, sets: 1, targetReps: 10, targetWeight: 60 }
      ]
    };
    render(<WorkoutPage
      workoutRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([focusedTemplate]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([exercise, secondExercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-focused'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));
    const firstToggle = await screen.findByRole('button', { name: 'Свернуть Приседания' });
    const secondToggle = screen.getByRole('button', { name: 'Развернуть Жим лёжа' });
    expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
    expect(secondToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Повторы подхода 1 для Приседания')).toBeInTheDocument();
    const secondPanelId = secondToggle.getAttribute('aria-controls');
    expect(secondPanelId).toBeTruthy();
    const secondPanel = document.getElementById(secondPanelId!);
    expect(secondPanel).toBeInTheDocument();
    expect(secondPanel).toHaveAttribute('hidden');
    expect(screen.queryByRole('spinbutton', { name: 'Повторы подхода 1 для Жим лёжа' })).not.toBeInTheDocument();
    expect(within(secondPanel!).getByRole('spinbutton', { name: 'Повторы подхода 1 для Жим лёжа', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '12' } });
    fireEvent.click(firstToggle);
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть Жим лёжа' }));
    expect(secondPanel).not.toHaveAttribute('hidden');
    expect(screen.getByLabelText('Повторы подхода 1 для Жим лёжа')).toHaveValue(10);
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть Жим лёжа' }));
    expect(document.getElementById(secondPanelId!)).toBe(secondPanel);
    expect(secondPanel).toHaveAttribute('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть Приседания' }));
    expect(screen.getByLabelText('Повторы подхода 1 для Приседания')).toHaveValue(12);
  });

  it('shows a safe fallback when a template references a removed exercise', async () => {
    const missingExerciseTemplate: Template = {
      ...template,
      exercises: [{ exerciseId: 'internal-removed-id', order: 0, sets: 1 }]
    };
    render(<WorkoutPage
      workoutRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([missingExerciseTemplate]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-missing'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));
    expect(await screen.findByRole('heading', { name: 'Удалённое упражнение' })).toBeInTheDocument();
    expect(screen.queryByText('internal-removed-id')).not.toBeInTheDocument();
  });

  it('starts a workout from a template and saves recorded set values', async () => {
    const workoutRepository = { getAll: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue(undefined), getById: vi.fn(), remove: vi.fn() };
    render(<WorkoutPage
      workoutRepository={workoutRepository}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([template]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([exercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-1'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));

    expect(await screen.findByRole('heading', { name: 'Тренировка: Ноги' })).toBeInTheDocument();
    expect(screen.getByLabelText('Вес подхода 1 для Приседания')).toHaveValue(100);
    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Вес подхода 1 для Приседания'), { target: { value: '105' } });
    const completion = screen.getByRole('button', { name: 'Отметить подход 1 для Приседания выполненным' });
    expect(completion).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(completion);
    expect(completion).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Время подхода 1 для Приседания')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Расстояние подхода 1 для Приседания')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Отдых после подхода 1 для Приседания')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Заметки тренировки'), { target: { value: 'Техника стала лучше' } });
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout-1', templateId: 'template-1', date: '2026-08-17T12:00:00.000Z',
      notes: 'Техника стала лучше',
      exercises: [expect.objectContaining({ sets: [{ reps: 10, weight: 105, completed: true }, { reps: 8, weight: 100 }] })]
    })));
    expect(await screen.findByText('Тренировка сохранена')).toBeInTheDocument();
  });

  it('adds an exercise and manages its sets in a manual workout', async () => {
    const workoutRepository = { getAll: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue(undefined), getById: vi.fn(), remove: vi.fn() };
    render(<WorkoutPage
      workoutRepository={workoutRepository}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([exercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-empty'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Приседания' }));
    expect(screen.getByRole('heading', { name: 'Приседания' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Добавить подход/ }));
    expect(screen.getByLabelText('Повторы подхода 2 для Приседания')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить подход 2 для Приседания' }));
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout-empty', date: '2026-08-17T12:00:00.000Z',
      exercises: [{ exerciseId: 'exercise-1', order: 0, sets: [{ reps: 12 }] }]
    })));
  });

  it.each([
    { type: 'strength' as const, expected: { weight: 50, reps: 10 }, absent: ['time', 'distance'] as const },
    { type: 'cardio' as const, expected: { time: 600, distance: 2.5 }, absent: ['weight', 'reps'] as const },
    { type: 'time' as const, expected: { time: 45 }, absent: ['weight', 'reps', 'distance'] as const },
    { type: 'reps' as const, expected: { reps: 20 }, absent: ['weight', 'time', 'distance'] as const }
  ])('shows and saves only metrics for a $type exercise', async ({ type, expected, absent }) => {
    const typedExercise: Exercise = { ...exercise, id: `exercise-${type}`, name: 'Тест', type };
    const workoutRepository = { getAll: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue(undefined), getById: vi.fn(), remove: vi.fn() };
    render(<WorkoutPage
      workoutRepository={workoutRepository}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([typedExercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => `workout-${type}`}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Тест' }));
    const labels = {
      weight: 'Вес подхода 1 для Тест',
      reps: 'Повторы подхода 1 для Тест',
      time: 'Время подхода 1 для Тест',
      distance: 'Расстояние подхода 1 для Тест'
    };
    for (const [field, value] of Object.entries(expected)) {
      fireEvent.change(screen.getByLabelText(labels[field as keyof typeof labels]), { target: { value: String(value) } });
    }
    for (const field of absent) expect(screen.queryByLabelText(labels[field])).not.toBeInTheDocument();
    expect(screen.queryByText(/rest/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      exercises: [{ exerciseId: typedExercise.id, order: 0, sets: [expected] }]
    })));
  });

  it('runs and resets the configured timer without going below zero', async () => {
    const timedExercise: Exercise = { ...exercise, restSeconds: 90 };
    render(<WorkoutPage
      workoutRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([template]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([timedExercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-timer'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));
    const timer = await screen.findByRole('region', { name: 'Таймер отдыха' });
    expect(timer).toHaveTextContent('01:30');
    vi.useFakeTimers();
    const completion = screen.getByRole('button', { name: 'Отметить подход 1 для Приседания выполненным' });
    fireEvent.click(completion);
    expect(completion).toHaveAttribute('aria-pressed', 'true');
    expect(within(timer).getByRole('button', { name: 'Приостановить таймер отдыха' })).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(timer).toHaveTextContent('01:29');
    fireEvent.click(completion);
    expect(completion).toHaveAttribute('aria-pressed', 'false');
    expect(within(timer).getByRole('button', { name: 'Приостановить таймер отдыха' })).toBeInTheDocument();
    fireEvent.click(completion);
    expect(timer).toHaveTextContent('01:30');
    await act(async () => { vi.advanceTimersByTime(100_000); });
    expect(timer).toHaveTextContent('00:00');
    expect(timer).not.toHaveTextContent('-');
    fireEvent.click(within(timer).getByRole('button', { name: 'Сбросить таймер' }));
    expect(timer).toHaveTextContent('01:30');
  });

  it('does not invent a timer duration for an exercise without the optional setting', async () => {
    render(<WorkoutPage
      workoutRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([template]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([exercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-no-timer'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));
    const timer = screen.getByRole('region', { name: 'Таймер отдыха' });
    expect(timer).toHaveTextContent('Таймер не настроен');
    expect(timer).toHaveTextContent('--:--');
    const completion = screen.getByRole('button', { name: 'Отметить подход 1 для Приседания выполненным' });
    fireEvent.click(completion);
    expect(completion).toHaveAttribute('aria-pressed', 'true');
    expect(timer).toHaveTextContent('Таймер не настроен');
  });

  it('keeps timer controls bound to the displayed exercise after focus changes', async () => {
    const timedExercise: Exercise = { ...exercise, restSeconds: 90 };
    const focusedTemplate: Template = {
      ...template,
      exercises: [
        { exerciseId: exercise.id, order: 0, sets: 1 },
        { exerciseId: secondExercise.id, order: 1, sets: 1 }
      ]
    };
    render(<WorkoutPage
      workoutRepository={{ getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      templateRepository={{ getAll: vi.fn().mockResolvedValue([focusedTemplate]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      exerciseRepository={{ getAll: vi.fn().mockResolvedValue([timedExercise, secondExercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }}
      createId={() => 'workout-switch-timer'}
      now={() => '2026-08-17T12:00:00.000Z'}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Начать тренировку по шаблону Ноги' }));
    const timer = await screen.findByRole('region', { name: 'Таймер отдыха' });
    vi.useFakeTimers();
    fireEvent.click(within(timer).getByRole('button', { name: 'Запустить таймер отдыха' }));
    await act(async () => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть Жим лёжа' }));
    fireEvent.click(within(timer).getByRole('button', { name: 'Приостановить таймер отдыха' }));
    expect(timer).toHaveTextContent('Приседания');
    fireEvent.click(within(timer).getByRole('button', { name: 'Запустить таймер отдыха' }));
    await act(async () => { vi.advanceTimersByTime(1000); });

    expect(timer).toHaveTextContent('01:28');
    expect(timer).toHaveTextContent('Приседания');
  });
});
