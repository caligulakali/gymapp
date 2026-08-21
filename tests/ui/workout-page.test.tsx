import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise, Template } from '../../src/db/entities';
import { WorkoutPage } from '../../src/ui/workouts/workout-page';

const exercise: Exercise = {
  id: 'exercise-1', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false
};
const template: Template = {
  id: 'template-1', name: 'Ноги', exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 2, targetReps: 8, targetWeight: 100 }]
};

describe('WorkoutPage', () => {
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
    fireEvent.change(screen.getByLabelText('Время подхода 1 для Приседания'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Расстояние подхода 1 для Приседания'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText('Отдых после подхода 1 для Приседания'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Заметки тренировки'), { target: { value: 'Техника стала лучше' } });
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout-1', templateId: 'template-1', date: '2026-08-17T12:00:00.000Z',
      notes: 'Техника стала лучше',
      exercises: [expect.objectContaining({ sets: [expect.objectContaining({ reps: 10, weight: 105, time: 60, distance: 1.5, rest: 90 }), expect.objectContaining({ reps: 8, weight: 100 })] })]
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
});
