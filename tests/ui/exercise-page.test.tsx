import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/db/entities';
import { ExercisePage } from '../../src/ui/exercises/exercise-page';

const exercise: Exercise = {
  id: 'exercise-1',
  name: 'Жим лёжа',
  muscleGroup: 'chest',
  type: 'strength',
  unit: 'kg',
  notes: '',
  favourite: false
};

function createRepository(exercises: Exercise[] = []) {
  return {
    getAll: vi.fn().mockResolvedValue(exercises),
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined)
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExercisePage', () => {
  it('creates an exercise through the repository', async () => {
    const repository = createRepository();
    render(<ExercisePage repository={repository} />);

    fireEvent.change(await screen.findByLabelText('Название'), { target: { value: 'Тяга верхнего блока' } });
    fireEvent.change(screen.getByLabelText('Мышечная группа'), { target: { value: 'back' } });
    fireEvent.change(screen.getByLabelText('Тип'), { target: { value: 'strength' } });
    fireEvent.change(screen.getByLabelText('Единица веса'), { target: { value: 'lb' } });
    fireEvent.change(screen.getByLabelText('Заметки'), { target: { value: 'Техника' } });
    fireEvent.click(screen.getByLabelText('Избранное'));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить упражнение' }));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Тяга верхнего блока',
      muscleGroup: 'back',
      type: 'strength',
      unit: 'lb',
      notes: 'Техника',
      favourite: true
    })));
  });

  it('edits an existing exercise', async () => {
    const repository = createRepository([exercise]);
    render(<ExercisePage repository={repository} />);

    await screen.findByText('Жим лёжа');
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать Жим лёжа' }));
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Жим гантелей' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith({
      ...exercise,
      name: 'Жим гантелей',
      notes: undefined
    }));
  });

  it('asks for confirmation before deleting an exercise', async () => {
    const repository = createRepository([exercise]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ExercisePage repository={repository} />);

    await screen.findByText('Жим лёжа');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить Жим лёжа' }));

    await waitFor(() => expect(repository.remove).toHaveBeenCalledWith('exercise-1'));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Жим лёжа')).not.toBeInTheDocument());
  });

  it('does not delete an exercise when confirmation is declined', async () => {
    const repository = createRepository([exercise]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ExercisePage repository={repository} />);

    await screen.findByText('Жим лёжа');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить Жим лёжа' }));

    expect(repository.remove).not.toHaveBeenCalled();
    expect(screen.getByText('Жим лёжа')).toBeInTheDocument();
  });

  it('shows detailed muscle groups grouped by category', async () => {
    render(<ExercisePage repository={createRepository()} />);

    const select = await screen.findByLabelText('Мышечная группа');
    const armsGroup = select.querySelector('optgroup[label="Руки"]');
    expect(armsGroup).toBeInTheDocument();
    expect(armsGroup).toHaveTextContent('Бицепс');
    expect(armsGroup).toHaveTextContent('Трицепс');
    expect(armsGroup).toHaveTextContent('Брахиалис');
  });

  it('saves a detailed muscle group', async () => {
    const repository = createRepository();
    render(<ExercisePage repository={repository} />);

    fireEvent.change(await screen.findByLabelText('Название'), { target: { value: 'Подъём штанги' } });
    fireEvent.change(screen.getByLabelText('Мышечная группа'), { target: { value: 'arms_biceps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить упражнение' }));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      muscleGroup: 'arms_biceps'
    })));
  });

  it('shows the muscle group label next to the exercise', async () => {
    const detailedExercise: Exercise = { ...exercise, muscleGroup: 'arms_biceps' };
    render(<ExercisePage repository={createRepository([detailedExercise])} />);

    expect(await within(screen.getByLabelText('Список упражнений')).findByText('Бицепс')).toBeInTheDocument();
  });

  it('keeps a legacy muscle group when editing an exercise', async () => {
    const legacyExercise: Exercise = { ...exercise, muscleGroup: 'arms' };
    render(<ExercisePage repository={createRepository([legacyExercise])} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать Жим лёжа' }));
    expect(screen.getByLabelText('Мышечная группа')).toHaveValue('arms');
  });

  it('shows an error and keeps the exercise when deletion fails', async () => {
    const repository = createRepository([exercise]);
    repository.remove.mockRejectedValue(new Error('IndexedDB unavailable'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ExercisePage repository={repository} />);

    await screen.findByText('Жим лёжа');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить Жим лёжа' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Не удалось удалить упражнение'));
    expect(screen.getByText('Жим лёжа')).toBeInTheDocument();
  });
});
