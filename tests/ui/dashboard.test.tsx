import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/app';

const repositories = {
  exerciseRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() },
  templateRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() },
  workoutRepository: { getAll: vi.fn().mockResolvedValue([]), save: vi.fn(), getById: vi.fn(), remove: vi.fn() }
};

describe('dashboard shell', () => {
  it('shows an honest dashboard without deferred analytics placeholders', async () => {
    render(<App {...repositories} />);

    expect(screen.getByRole('heading', { name: 'Обзор' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
    expect(screen.queryByText('Регулярность')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Профиль' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Прогресс' })).not.toBeInTheDocument();
    expect(screen.queryByText('Понедельник, 17 августа')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Подробнее' })).not.toBeInTheDocument();
  });
});
