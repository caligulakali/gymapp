import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Template } from '../../src/db/entities';
import { TemplatePage } from '../../src/ui/templates/template-page';

const exercise: Exercise = {
  id: 'exercise-1',
  name: 'Приседания',
  muscleGroup: 'legs',
  type: 'strength',
  unit: 'kg',
  favourite: false
};

const template: Template = {
  id: 'template-1',
  name: 'Ноги',
  notes: 'Тяжёлая тренировка',
  exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 4, targetReps: 8, targetWeight: 100 }]
};

function createRepositories(templates: Template[] = []) {
  return {
    templateRepository: {
      getAll: vi.fn().mockResolvedValue(templates),
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    },
    exerciseRepository: {
      getAll: vi.fn().mockResolvedValue([exercise])
    }
  };
}

afterEach(() => vi.restoreAllMocks());

describe('TemplatePage', () => {
  it('creates a template from an existing exercise', async () => {
    const repositories = createRepositories();
    render(<TemplatePage {...repositories} />);

    fireEvent.change(await screen.findByLabelText('Название шаблона'), { target: { value: 'Сильные ноги' } });
    const exerciseSelect = screen.getByLabelText('Упражнение');
    expect(exerciseSelect).toHaveValue('exercise-1');
    fireEvent.change(screen.getByLabelText('Заметки шаблона'), { target: { value: 'Контроль техники' } });
    fireEvent.change(screen.getByLabelText('Количество подходов'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Целевые повторения'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Целевой вес'), { target: { value: '110' } });
    expect(screen.getByLabelText('Заметки шаблона')).toHaveValue('Контроль техники');
    expect(screen.getByLabelText('Количество подходов')).toHaveValue(5);
    expect(screen.getByLabelText('Целевые повторения')).toHaveValue(6);
    expect(screen.getByLabelText('Целевой вес')).toHaveValue(110);
    fireEvent.click(screen.getByRole('button', { name: 'Добавить упражнение' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить шаблон' }));

    await waitFor(() => expect(repositories.templateRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Сильные ноги',
      notes: 'Контроль техники',
      exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 5, targetReps: 6, targetWeight: 110 }]
    })));
  });

  it('edits an existing template', async () => {
    const repositories = createRepositories([template]);
    render(<TemplatePage {...repositories} />);

    await screen.findByText('Ноги');
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать шаблон Ноги' }));
    fireEvent.change(screen.getByLabelText('Название шаблона'), { target: { value: 'Ноги и ягодицы' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения шаблона' }));

    await waitFor(() => expect(repositories.templateRepository.save).toHaveBeenCalledWith({
      ...template,
      name: 'Ноги и ягодицы'
    }));
  });

  it('duplicates an existing template with a new id', async () => {
    const repositories = createRepositories([template]);
    const createId = vi.fn().mockReturnValue('template-copy');
    render(<TemplatePage {...repositories} createId={createId} />);

    await screen.findByText('Ноги');
    fireEvent.click(screen.getByRole('button', { name: 'Дублировать шаблон Ноги' }));

    await waitFor(() => expect(repositories.templateRepository.save).toHaveBeenCalledWith({
      ...template,
      id: 'template-copy',
      name: 'Ноги — копия'
    }));
    const savedTemplate = repositories.templateRepository.save.mock.calls[0][0] as Template;
    expect(savedTemplate.exercises).not.toBe(template.exercises);
    expect(savedTemplate.exercises[0]).not.toBe(template.exercises[0]);
    expect(createId).toHaveBeenCalledOnce();
  });

  it('confirms deletion of a template', async () => {
    const repositories = createRepositories([template]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TemplatePage {...repositories} />);

    await screen.findByText('Ноги');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить шаблон Ноги' }));

    await waitFor(() => expect(repositories.templateRepository.remove).toHaveBeenCalledWith('template-1'));
    await waitFor(() => expect(screen.queryByText('Ноги')).not.toBeInTheDocument());
  });

  it('does not delete a template when confirmation is declined', async () => {
    const repositories = createRepositories([template]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TemplatePage {...repositories} />);

    await screen.findByText('Ноги');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить шаблон Ноги' }));

    expect(repositories.templateRepository.remove).not.toHaveBeenCalled();
    expect(screen.getByText('Ноги')).toBeInTheDocument();
  });
});
