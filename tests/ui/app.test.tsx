import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('shows the workout journal entry point in Russian', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'GymApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
    expect(screen.queryByText('Офлайн')).not.toBeInTheDocument();
    expect(document.querySelector('.mobile-header')).not.toBeInTheDocument();
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
    expect(window.location.pathname).toBe('/exercises');
  });

  it('opens a page directly from its URL', async () => {
    window.history.replaceState(null, '', '/templates');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Шаблоны' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Шаблоны' })).toHaveAttribute('aria-current', 'page');
  });

  it('follows browser history navigation', async () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'История' }));
    expect(await screen.findByRole('heading', { name: 'История' })).toBeInTheDocument();

    window.history.back();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
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

  it('switches sections from mobile navigation and exposes the active destination', async () => {
    render(<App />);

    const mobileNavigation = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    const overview = within(mobileNavigation).getByRole('button', { name: 'Обзор' });
    const history = within(mobileNavigation).getByRole('button', { name: 'История' });
    const templates = within(mobileNavigation).getByRole('button', { name: 'Шаблоны' });

    expect(overview).toHaveAttribute('aria-current', 'page');
    fireEvent.click(history);
    expect(await screen.findByRole('heading', { name: 'История' })).toBeInTheDocument();
    expect(history).toHaveAttribute('aria-current', 'page');

    fireEvent.click(templates);
    expect(await screen.findByRole('heading', { name: 'Шаблоны' })).toBeInTheDocument();
    expect(templates).toHaveAttribute('aria-current', 'page');
    expect(overview).not.toHaveAttribute('aria-current');
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

  it('refreshes the shared exercise catalogue after deletion', async () => {
    const exercise = { id: 'squat', name: 'Приседания', muscleGroup: 'legs' as const, type: 'strength' as const, unit: 'kg' as const, favourite: false };
    const workout = { id: 'workout-1', date: '2026-08-18T10:00:00.000Z', exercises: [{ exerciseId: 'squat', order: 0, sets: [{}] }] };
    let deleted = false;
    const exerciseRepository = {
      getAll: vi.fn().mockImplementation(() => Promise.resolve(deleted ? [] : [exercise])),
      save: vi.fn(),
      remove: vi.fn().mockImplementation(async () => { deleted = true; })
    };
    const workoutRepository = { getAll: vi.fn().mockResolvedValue([workout]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() };
    const templateRepository = { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() };
    render(<App exerciseRepository={exerciseRepository} templateRepository={templateRepository} workoutRepository={workoutRepository} />);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Упражнения' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Удалить Приседания' }));
    await waitFor(() => expect(exerciseRepository.remove).toHaveBeenCalledWith('squat'));
    await waitFor(() => expect(exerciseRepository.getAll).toHaveBeenCalledTimes(3));

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'История' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Открыть тренировку Свободная тренировка' }));
    expect(screen.getByRole('heading', { name: 'Удалённое упражнение' })).toBeInTheDocument();
  });
});
