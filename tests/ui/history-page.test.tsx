import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Template, Workout } from '../../src/db/entities';
import { HistoryPage } from '../../src/ui/history-page';

const workout: Workout = {
  id: 'workout-1',
  date: '2026-08-18T10:00:00.000Z',
  notes: 'Старая заметка',
  exercises: [{ exerciseId: 'squat', order: 0, sets: [{ weight: 100, reps: 8 }] }]
};
const oldWorkout: Workout = { ...workout, id: 'workout-old', date: '2026-07-01T10:00:00.000Z', templateId: 'legs' };
const template: Template = { id: 'legs', name: 'Ноги', exercises: [{ exerciseId: 'squat', order: 0, sets: 3 }] };
const exercise: Exercise = { id: 'squat', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false };
const bench: Exercise = { id: 'bench', name: 'Жим лёжа', muscleGroup: 'chest', type: 'strength', unit: 'kg', favourite: false };

afterEach(() => vi.restoreAllMocks());

function repository() {
  return { save: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) };
}

describe('HistoryPage', () => {
  it('opens and saves edits for a completed workout', async () => {
    const repo = repository();
    render(<HistoryPage workouts={[workout]} repository={repo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть тренировку Свободная тренировка' }));
    fireEvent.change(screen.getByLabelText('Заметки тренировки'), { target: { value: 'Обновлённая заметка' } });
    fireEvent.change(screen.getByLabelText('Вес подхода 1 для squat'), { target: { value: '105' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    await waitFor(() => expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'workout-1',
      notes: 'Обновлённая заметка',
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ weight: 105, reps: 8 }] }]
    })));
    expect(await screen.findByText('Тренировка обновлена')).toBeInTheDocument();
  });

  it('does not remove a workout when confirmation is declined', async () => {
    const repo = repository();
    render(<HistoryPage workouts={[workout]} repository={repo} confirmDelete={() => false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Удалить тренировку Свободная тренировка' }));

    await waitFor(() => expect(repo.remove).not.toHaveBeenCalled());
  });

  it('filters workouts by period, template, and exercise', () => {
    const repo = repository();
    render(<HistoryPage workouts={[workout, oldWorkout]} repository={repo} templates={[template]} exercises={[exercise]} now={() => '2026-08-18T12:00:00.000Z'} />);

    expect(screen.getByRole('button', { name: 'Открыть тренировку Свободная тренировка' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть тренировку Тренировка по шаблону' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Период'), { target: { value: '7' } });

    expect(screen.getByRole('button', { name: 'Открыть тренировку Свободная тренировка' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть тренировку Тренировка по шаблону' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Период'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Шаблон'), { target: { value: 'legs' } });

    expect(screen.queryByRole('button', { name: 'Открыть тренировку Свободная тренировка' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть тренировку Тренировка по шаблону' })).toBeInTheDocument();
  });

  it('adds and removes exercises while editing a workout', () => {
    const repo = repository();
    render(<HistoryPage workouts={[workout]} repository={repo} exercises={[exercise, bench]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть тренировку Свободная тренировка' }));
    fireEvent.change(screen.getByLabelText('Новое упражнение'), { target: { value: 'bench' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }));
    expect(screen.getByText('bench')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить упражнение bench' }));
    expect(screen.queryByText('bench')).not.toBeInTheDocument();
  });
});
