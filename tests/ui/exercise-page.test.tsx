import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../src/db/entities';
import { ExercisePage } from '../../src/ui/exercises/exercise-page';

const exercise: Exercise = {
  id: 'exercise-1',
  name: 'Жим лёжа',
  equipment: 'barbell',
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

async function openNewExercise(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: 'Новое упражнение' }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExercisePage', () => {
  it('creates an exercise through the repository', async () => {
    const repository = createRepository();
    render(<ExercisePage repository={repository} />);

    expect(await screen.findByRole('button', { name: 'Новое упражнение' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Название')).not.toBeInTheDocument();
    await openNewExercise();
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Тяга верхнего блока' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Блочный тренажёр' }));
    fireEvent.change(screen.getByLabelText('Мышечная группа'), { target: { value: 'back' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить упражнение' }));

    await waitFor(() => expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Тяга верхнего блока',
      equipment: 'cable',
      muscleGroup: 'back',
      type: 'strength',
      unit: 'kg',
      favourite: false
    })));
    expect(await screen.findByRole('button', { name: 'Новое упражнение' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Название')).not.toBeInTheDocument();
    expect(screen.getByText('Тяга верхнего блока')).toBeInTheDocument();
  });

  it('keeps creation focused on name, equipment and muscle group', async () => {
    render(<ExercisePage repository={createRepository()} />);

    await openNewExercise();

    expect(screen.getByLabelText('Название')).toBeInTheDocument();
    const equipment = screen.getByRole('radiogroup', { name: 'Снаряд' });
    expect(within(equipment).getByRole('radio', { name: 'Гантели' })).toBeInTheDocument();
    expect(within(equipment).getByRole('radio', { name: 'Штанга' })).toBeInTheDocument();
    expect(within(equipment).getByRole('radio', { name: 'Тренажёр' })).toBeInTheDocument();
    expect(screen.getByLabelText('Мышечная группа')).toBeInTheDocument();
    expect(screen.queryByLabelText('Тип')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Единица веса')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Дополнительно' })).not.toBeInTheDocument();
  });

  it('returns from a new exercise without saving', async () => {
    const repository = createRepository();
    render(<ExercisePage repository={repository} />);

    await openNewExercise();
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Несохранённое упражнение' } });
    fireEvent.click(screen.getByRole('button', { name: 'Назад к упражнениям' }));

    expect(await screen.findByRole('button', { name: 'Новое упражнение' })).toBeInTheDocument();
    expect(repository.save).not.toHaveBeenCalled();
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
    expect(await screen.findByRole('button', { name: 'Новое упражнение' })).toBeInTheDocument();
    expect(screen.getByText('Жим гантелей')).toBeInTheDocument();
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

    await openNewExercise();
    const select = screen.getByLabelText('Мышечная группа');
    const armsGroup = select.querySelector('optgroup[label="Руки"]');
    expect(armsGroup).toBeInTheDocument();
    expect(armsGroup).toHaveTextContent('Бицепс');
    expect(armsGroup).toHaveTextContent('Трицепс');
    expect(armsGroup).toHaveTextContent('Брахиалис');
  });

  it('opens a visual muscle group catalog and selects a subgroup', async () => {
    render(<ExercisePage repository={createRepository()} />);

    await openNewExercise();
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать мышечную группу' }));

    const menu = document.querySelector('.muscle-picker-menu');
    expect(menu).toBeInTheDocument();
    expect(menu?.parentElement).toHaveClass('muscle-picker');
    expect(menu?.querySelector('[aria-label="Руки"]')).toBeInTheDocument();
    fireEvent.click(within(menu as HTMLElement).getByRole('option', { name: 'Бицепс' }));

    expect(screen.getByRole('button', { name: 'Выбрать мышечную группу' })).toHaveTextContent('Бицепс');
    expect(screen.getByLabelText('Мышечная группа')).toHaveValue('arms_biceps');
  });

  it('saves a detailed muscle group', async () => {
    const repository = createRepository();
    render(<ExercisePage repository={repository} />);

    await openNewExercise();
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Подъём штанги' } });
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

  it('filters the exercise catalogue locally and restores it when cleared', async () => {
    const row: Exercise = { ...exercise, id: 'exercise-2', name: 'Тяга блока', muscleGroup: 'back' };
    const repository = createRepository([exercise, row]);
    render(<ExercisePage repository={repository} />);

    const search = await screen.findByRole('searchbox', { name: 'Поиск упражнений' });
    expect(screen.getByText('Жим лёжа')).toBeInTheDocument();
    expect(screen.getByText('Тяга блока')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'тяга' } });
    expect(screen.queryByText('Жим лёжа')).not.toBeInTheDocument();
    expect(screen.getByText('Тяга блока')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByText('Жим лёжа')).toBeInTheDocument();
    expect(screen.getByText('Тяга блока')).toBeInTheDocument();
    expect(repository.getAll).toHaveBeenCalledOnce();
  });

  it('keeps rendering when a stored exercise has an unknown muscle group', async () => {
    const invalidExercise = { ...exercise, muscleGroup: 'unknown' as never };
    render(<ExercisePage repository={createRepository([invalidExercise])} />);

    expect(await within(screen.getByLabelText('Список упражнений')).findByText('Неизвестная группа')).toBeInTheDocument();
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
