import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workout } from '../../src/db/entities';
import { HistoryPage } from '../../src/ui/history-page';

const workout: Workout = {
  id: 'workout-1',
  date: '2026-08-18T10:00:00.000Z',
  notes: 'Старая заметка',
  exercises: [{ exerciseId: 'squat', order: 0, sets: [{ weight: 100, reps: 8 }] }]
};

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
});
