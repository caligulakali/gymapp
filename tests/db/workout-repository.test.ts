import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '../../src/db/database';
import { exerciseRepository } from '../../src/db/exercise-repository';
import { templateRepository } from '../../src/db/template-repository';
import { workoutRepository } from '../../src/db/workout-repository';

const workout = {
  id: 'workout-1',
  templateId: 'template-1',
  date: '2026-08-17T12:00:00.000Z',
  exercises: [{ exerciseId: 'exercise-1', order: 0, sets: [{ reps: 8, weight: 100 }] }]
};

describe('workoutRepository', () => {
  afterEach(async () => {
    await resetDatabase();
  });

  it('saves and reads a workout locally', async () => {
    await workoutRepository.save(workout);

    await expect(workoutRepository.getById(workout.id)).resolves.toEqual(workout);
  });

  it('updates by stable id without duplicating a workout', async () => {
    await workoutRepository.save(workout);
    await workoutRepository.save({ ...workout, notes: 'Рабочие веса выросли' });

    await expect(workoutRepository.getAll()).resolves.toEqual([
      { ...workout, notes: 'Рабочие веса выросли' }
    ]);
  });

  it('migrates a v3 database while preserving exercises and templates', async () => {
    const legacyDatabase = new Dexie('gymapp');
    legacyDatabase.version(3).stores({
      exercises: 'id, name, muscleGroup, type, favourite',
      templates: 'id, name'
    });
    await legacyDatabase.open();
    await legacyDatabase.table('exercises').put({
      id: 'exercise-1', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false
    });
    await legacyDatabase.table('templates').put({
      id: 'template-1', name: 'Ноги', exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 3 }]
    });
    legacyDatabase.close();

    await workoutRepository.save(workout);

    await expect(exerciseRepository.getById('exercise-1')).resolves.toEqual({
      id: 'exercise-1', name: 'Приседания', equipment: 'other', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false
    });
    await expect(templateRepository.getById('template-1')).resolves.toEqual({
      id: 'template-1', name: 'Ноги', exercises: [{ exerciseId: 'exercise-1', order: 0, sets: 3 }]
    });
    await expect(workoutRepository.getAll()).resolves.toEqual([workout]);
  });
});
