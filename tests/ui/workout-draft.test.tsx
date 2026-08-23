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
  it('reports a pending draft write and confirms it only after persistence succeeds', async () => {
    const repos = repositories();
    let releaseSave!: () => void;
    repos.draftRepository.saveDraft.mockImplementation(() => new Promise<void>((resolve) => { releaseSave = resolve; }));
    render(<WorkoutPage {...repos} createId={() => 'draft-status'} now={() => '2026-08-18T10:00:00.000Z'} />);

    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('Сохраняем…');
    expect(screen.queryByText('Черновик сохранён')).not.toBeInTheDocument();

    releaseSave();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Черновик сохранён'));
    expect(screen.queryByText('Сохраняем…')).not.toBeInTheDocument();
  });

  it('warns when draft persistence fails without claiming it was saved', async () => {
    const repos = repositories();
    repos.draftRepository.saveDraft.mockRejectedValueOnce(new Error('storage unavailable'));
    render(<WorkoutPage {...repos} createId={() => 'draft-error'} now={() => '2026-08-18T10:00:00.000Z'} />);

    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить черновик');
    expect(screen.queryByText('Черновик сохранён')).not.toBeInTheDocument();
  });

  it('saves the active workout draft as values change', async () => {
    const repos = repositories();
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    expect(screen.getByRole('region', { name: 'Таймер отдыха' })).toHaveTextContent('Таймер не настроен');
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Приседания' }));
    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '8' } });

    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-1', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8 }] }] })));
  });

  it('restores a saved draft and clears it after completion', async () => {
    const repos = repositories();
    const draft = { id: 'draft-1', date: '2026-08-18T10:00:00.000Z', notes: 'Черновик', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8, time: 60, distance: 1.5, rest: 90, completed: true }] }] };
    repos.draftRepository.getDraft.mockResolvedValue(draft);
    render(<WorkoutPage {...repos} createId={() => 'new-id'} now={() => '2026-08-18T10:00:00.000Z'} confirmDiscard={() => true} />);

    expect(await screen.findByRole('heading', { name: 'Тренировка: Свободная' })).toBeInTheDocument();
    expect(screen.getByLabelText('Повторы подхода 1 для Приседания')).toHaveValue(8);
    expect(screen.getByRole('button', { name: 'Отметить подход 1 для Приседания невыполненным' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Время подхода 1 для Приседания')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
    expect(repos.workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 9, time: 60, distance: 1.5, rest: 90, completed: true }] }]
    }));
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

  it('saves the last edited value when completion follows the input immediately', async () => {
    const repos = repositories();
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Приседания' }));

    fireEvent.change(screen.getByLabelText('Повторы подхода 1 для Приседания'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Завершить и сохранить тренировку' }));

    await waitFor(() => expect(repos.workoutRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 9 }] }]
    })));
  });

  it('waits for pending writes before clearing a discarded draft', async () => {
    const repos = repositories();
    let releaseSave!: () => void;
    repos.draftRepository.saveDraft.mockImplementation(() => new Promise<void>((resolve) => { releaseSave = resolve; }));
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} confirmDiscard={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Отменить черновик' }));
    expect(repos.draftRepository.clearDraft).not.toHaveBeenCalled();
    releaseSave();

    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Начать тренировку' })).toBeInTheDocument();
  });

  it('does not enqueue edits made after draft discard starts', async () => {
    const repos = repositories();
    let releaseSave!: () => void;
    repos.draftRepository.saveDraft
      .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseSave = resolve; }))
      .mockResolvedValue(undefined);
    render(<WorkoutPage {...repos} createId={() => 'draft-1'} now={() => '2026-08-18T10:00:00.000Z'} confirmDiscard={() => true} />);
    fireEvent.click(await screen.findByRole('button', { name: /Пустая тренировка/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить Приседания' }));
    const repsInput = screen.getByLabelText('Повторы подхода 1 для Приседания');
    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Отменить черновик' }));
    fireEvent.change(repsInput, { target: { value: '12' } });
    releaseSave();

    await waitFor(() => expect(repos.draftRepository.clearDraft).toHaveBeenCalled());
    await waitFor(() => expect(repos.draftRepository.saveDraft).toHaveBeenCalledTimes(2));
    expect(repos.draftRepository.saveDraft).not.toHaveBeenCalledWith(expect.objectContaining({
      exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 12 }] }]
    }));
  });

  it('rejects a malformed stored draft and removes it', async () => {
    const repos = repositories();
    repos.draftRepository.getDraft.mockResolvedValue({ id: 'broken', date: 'not-a-date', exercises: [] });
    render(<WorkoutPage {...repos} createId={() => 'new-id'} now={() => '2026-08-18T10:00:00.000Z'} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Черновик повреждён');
    expect(repos.draftRepository.clearDraft).toHaveBeenCalled();
  });
});
