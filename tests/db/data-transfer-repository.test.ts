import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Exercise, Template, Workout } from '../../src/db/entities';
import { resetDatabase } from '../../src/db/database';
import { dataTransferRepository } from '../../src/db/data-transfer-repository';
import { workoutDraftRepository } from '../../src/db/workout-draft-repository';

const exercise: Exercise = { id: 'squat', name: 'Приседания', muscleGroup: 'legs', type: 'strength', unit: 'kg', favourite: false };
const template: Template = { id: 'legs', name: 'Ноги', exercises: [{ exerciseId: 'squat', order: 0, sets: 3 }] };
const workout: Workout = { id: 'workout', date: '2026-08-18T10:00:00.000Z', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8, weight: 100 }] }] };

afterEach(async () => resetDatabase());

describe('data transfer repository', () => {
  it('reads all local entities as one export snapshot', async () => {
    await dataTransferRepository.replaceData({ exercises: [exercise], templates: [template], workouts: [workout] });

    await expect(dataTransferRepository.getData()).resolves.toEqual({ exercises: [exercise], templates: [template], workouts: [workout] });
  });

  it('replaces all entity tables in one operation', async () => {
    await workoutDraftRepository.saveDraft(workout);
    await dataTransferRepository.replaceData({ exercises: [exercise], templates: [template], workouts: [workout] });
    await dataTransferRepository.replaceData({ exercises: [], templates: [], workouts: [] });

    await expect(dataTransferRepository.getData()).resolves.toEqual({ exercises: [], templates: [], workouts: [] });
    await expect(workoutDraftRepository.getDraft()).resolves.toBeUndefined();
  });
});
