import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDatabase, exerciseRepository } from '../../src/db/exercise-repository';

const exercise = {
  id: 'exercise-1',
  name: 'Приседания со штангой',
  muscleGroup: 'legs' as const,
  type: 'strength' as const,
  unit: 'kg' as const,
  notes: 'Контролировать глубину',
  favourite: false
};

describe('exerciseRepository', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('creates and reads an exercise from local IndexedDB', async () => {
    await exerciseRepository.save(exercise);

    await expect(exerciseRepository.getAll()).resolves.toEqual([exercise]);
  });

  it('updates an existing exercise without creating a duplicate', async () => {
    await exerciseRepository.save(exercise);
    await exerciseRepository.save({ ...exercise, name: 'Фронтальные приседания' });

    await expect(exerciseRepository.getAll()).resolves.toEqual([
      { ...exercise, name: 'Фронтальные приседания' }
    ]);
  });

  it('keeps one record when the same exercise is saved repeatedly', async () => {
    await exerciseRepository.save(exercise);
    await exerciseRepository.save(exercise);

    await expect(exerciseRepository.getAll()).resolves.toHaveLength(1);
  });

  it('deletes an exercise by stable id', async () => {
    await exerciseRepository.save(exercise);
    await exerciseRepository.remove(exercise.id);

    await expect(exerciseRepository.getAll()).resolves.toEqual([]);
  });
});
