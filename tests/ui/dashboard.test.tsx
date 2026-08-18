import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';

const repositories = {
  exerciseRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() },
  templateRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() },
  workoutRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }
};

describe('dashboard shell', () => {
  it('shows the dashboard with a quick-start action and summary cards', async () => {
    render(<App {...repositories} />);

    expect(screen.getByRole('heading', { name: 'Обзор' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
    expect(screen.getByText('Тренировки')).toBeInTheDocument();
    expect(screen.getByText('Объём за неделю')).toBeInTheDocument();
  });

  it('switches to progress without losing the app shell', () => {
    render(<App {...repositories} />);

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Основная навигация' })).getByRole('button', { name: 'Прогресс' }));

    expect(screen.getByRole('heading', { name: 'Прогресс' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument();
  });
});
