import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/app';

describe('App', () => {
  it('shows the workout journal entry point in Russian', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'GymApp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Начать тренировку' })).toBeInTheDocument();
  });
});
