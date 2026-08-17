import { fireEvent, render, screen } from '@testing-library/react';
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

    fireEvent.click(screen.getByRole('button', { name: 'Упражнения' }));

    expect(screen.getByRole('heading', { name: 'Упражнения' })).toBeInTheDocument();
  });
});
