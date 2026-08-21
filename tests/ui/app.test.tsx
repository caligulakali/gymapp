import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';

describe('App', () => {
  it('shows the workout journal entry point in Russian', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'GymApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
  });

  it('opens the exercises section from the main navigation', () => {
    const repository = {
      getAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    render(<App exerciseRepository={repository} />);

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Упражнения' }));

    expect(screen.getByRole('heading', { name: 'Упражнения' })).toBeInTheDocument();
  });

  it('opens the templates section from the main navigation', () => {
    const repositories = {
      exerciseRepository: {
        getAll: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      },
      templateRepository: {
        getAll: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
      }
    };
    render(<App {...repositories} />);

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Шаблоны' }));

    expect(screen.getByRole('heading', { name: 'Шаблоны' })).toBeInTheDocument();
  });

  it('keeps every primary section in the mobile navigation', () => {
    render(<App />);

    const mobileNavigation = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    expect(within(mobileNavigation).getByRole('button', { name: 'Обзор' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'История' })).toBeInTheDocument();
    expect(within(mobileNavigation).queryByRole('button', { name: 'Прогресс' })).not.toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'Упражнения' })).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'Шаблоны' })).toBeInTheDocument();
  });

  it('refreshes shared data after import without a page reload', async () => {
    let imported = false;
    const importedWorkout = { id: 'imported-workout', date: '2026-08-18T10:00:00.000Z', exercises: [] };
    const workoutRepository = {
      getAll: vi.fn().mockImplementation(() => Promise.resolve(imported ? [importedWorkout] : [])),
      save: vi.fn(),
      getById: vi.fn(),
      remove: vi.fn()
    };
    const exerciseRepository = {
      getAll: vi.fn().mockImplementation(() => Promise.resolve([])),
      save: vi.fn(),
      remove: vi.fn()
    };
    const templateRepository = {
      getAll: vi.fn().mockImplementation(() => Promise.resolve([])),
      save: vi.fn(),
      remove: vi.fn()
    };
    const dataTransferRepository = {
      getData: vi.fn().mockResolvedValue({ exercises: [], templates: [], workouts: [] }),
      replaceData: vi.fn().mockImplementation(async () => { imported = true; })
    };
    render(<App exerciseRepository={exerciseRepository} templateRepository={templateRepository} workoutRepository={workoutRepository} dataTransferRepository={dataTransferRepository} />);
    await waitFor(() => {
      expect(workoutRepository.getAll).toHaveBeenCalledOnce();
      expect(exerciseRepository.getAll).toHaveBeenCalledOnce();
      expect(templateRepository.getAll).toHaveBeenCalledOnce();
    });
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Данные' }));
    const payload = JSON.stringify({ format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z', exercises: [], templates: [], workouts: [importedWorkout] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.change(screen.getByLabelText('Импортировать файл .gymapp'), {
      target: { files: [new File([payload], 'backup.gymapp', { type: 'application/json' })] }
    });

    await screen.findByText('Данные успешно восстановлены');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Обзор' }));
    expect(await screen.findByText('Свободная тренировка')).toBeInTheDocument();
    expect(workoutRepository.getAll).toHaveBeenCalledTimes(2);
    expect(exerciseRepository.getAll).toHaveBeenCalledTimes(2);
    expect(templateRepository.getAll).toHaveBeenCalledTimes(2);
  });
});
