import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Workout } from '../../src/db/entities';
import { resetDatabase } from '../../src/db/database';
import { workoutDraftRepository } from '../../src/db/workout-draft-repository';

const draft: Workout = { id: 'workout-1', date: '2026-08-18T10:00:00.000Z', exercises: [{ exerciseId: 'squat', order: 0, sets: [{ reps: 8, completed: true }] }] };

afterEach(async () => resetDatabase());

describe('workout draft repository', () => {
  it('preserves the workout id while saving a single active draft', async () => {
    await workoutDraftRepository.saveDraft(draft);

    await expect(workoutDraftRepository.getDraft()).resolves.toEqual(draft);
  });

  it('clears the active draft', async () => {
    await workoutDraftRepository.saveDraft(draft);
    await workoutDraftRepository.clearDraft();

    await expect(workoutDraftRepository.getDraft()).resolves.toBeUndefined();
  });
});
