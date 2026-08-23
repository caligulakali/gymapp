import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase } from '../../src/db/database';
import { resetDatabase, exerciseRepository } from '../../src/db/exercise-repository';

const exercise = {
  id: 'exercise-1',
  name: 'Приседания со штангой',
  equipment: 'barbell' as const,
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

  it('reads the same record after the database connection is reopened', async () => {
    await exerciseRepository.save(exercise);
    await closeDatabase();

    await expect(exerciseRepository.getById(exercise.id)).resolves.toEqual(exercise);
  });

  it('migrates legacy records by adding the favourite flag', async () => {
    const legacyDatabase = new Dexie('gymapp');
    legacyDatabase.version(1).stores({ exercises: 'id, name, muscleGroup, type' });
    await legacyDatabase.open();
    await legacyDatabase.table('exercises').put({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      type: exercise.type,
      unit: exercise.unit
    });
    legacyDatabase.close();

    await expect(exerciseRepository.getById(exercise.id)).resolves.toMatchObject({ favourite: false });
  });

  it('migrates existing exercises with a safe equipment fallback', async () => {
    const legacyDatabase = new Dexie('gymapp');
    legacyDatabase.version(5).stores({
      exercises: 'id, name, muscleGroup, type, favourite',
      templates: 'id, name',
      workouts: 'id, date, templateId',
      drafts: 'id'
    });
    await legacyDatabase.open();
    await legacyDatabase.table('exercises').put({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      type: exercise.type,
      unit: exercise.unit,
      favourite: false
    });
    legacyDatabase.close();

    await expect(exerciseRepository.getById(exercise.id)).resolves.toMatchObject({ equipment: 'other' });
  });
});
