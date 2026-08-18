import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/db/entities';
import { WorkoutPage } from '../../src/ui/workouts/workout-page';

const exercise: Exercise = { id: 'squat', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false };
const repositories = () => ({
  workoutRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue(undefined), getById: vi.fn(), remove: vi.fn() },
  templateRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() },
  exerciseRepository: { getAll: vi.fn().mockResolvedValue([exercise]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() },
  draftRepository: { getDraft: vi.fn().mockResolvedValue(undefined), saveDraft: vi.fn().mockResolvedValue(undefined), clearDraft: vi.fn().mockResolvedValue(undefined) }
});

describe('WorkoutPage draft', () => {
  it('saves the active workout draft as values change', async () => {
    const repos = repositories();
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Приседания' }));
    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '8' } });

    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-1', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8 }] }] })));
  });

  it('restores a saved draft and clears it after completion', async () => {
    const repos = repositories();
    const draft = { id: 'draft-1', date: '2026-08-18T10:00:00.000Z', notes: 'Черновик', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8 }] }] };
    repos.draftRepository.getDraft.mockResolvedValue(draft);
    render(<WorkoutPage {...repos} createId={() => 'new-id'} now={() => '2026-08-18T10:00:00.000Z'} confirmDiscard={() => true} />);

    expect(await screen.findByRole('heading', { name: 'Тренировка: Свободная' })).toBeInTheDocument();
    expect(screen.getByLabelText('Повторы подхода 1 для Приседания')).toHaveValue(8);
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
  });

  it('allows discarding a draft after confirmation', async () => {
    const repos = repositories();
    repos.draftRepository.getDraft.mockResolvedValue({ id: 'draft-1', date: '2026-08-18T10:00:00.000Z', exercises: [] });
    render(<WorkoutPage {...repos} createId={() => 'new-id'} now={() => '2026-08-18T10:00:00.000Z'} confirmDiscard={() => true} />);

    await screen.findByRole('heading', { name: 'Тренировка: Свободная' });
    fireEvent.click(screen.getByRole('button', { name: 'Отменить черновик' }));

    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Начать тренировку' })).toBeInTheDocument();
  });

  it('waits for the latest draft save before clearing it', async () => {
    const repos = repositories();
    let releaseSave!: () => void;
    repos.draftRepository.saveDraft.mockImplementation(() => new Promise<void>((resolve) => { releaseSave = resolve; }));
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalled());
    expect(repos.draftRepository.clearDraft).not.toHaveBeenCalled();
    releaseSave();
    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
  });

  it('rejects a malformed stored draft and removes it', async () => {
    const repos = repositories();
    repos.draftRepository.getDraft.mockResolvedValue({ id: 'broken', date: 'not-a-date', exercises: [] });
    render(<WorkoutPage {...repos} createId={() => 'new-id'} now={() => '2026-08-18T10:00:00.000Z'} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Черновик повреждён');
    expect(repos.draftRepository.clearDraft).toHaveBeenCalled();
  });
});
