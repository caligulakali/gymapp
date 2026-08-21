import type { WorkoutDraftRepositoryPort } from '../domain/workout-draft-repository-port';
import { getDatabase } from './database';

const ACTIVE_DRAFT_ID = 'active';

export const workoutDraftRepository: WorkoutDraftRepositoryPort = {
  async getDraft() {
    return (await getDatabase().drafts.get(ACTIVE_DRAFT_ID))?.workout;
  },

  async saveDraft(workout) {
    await getDatabase().drafts.put({ id: ACTIVE_DRAFT_ID, workout });
  },

  async clearDraft() {
    await getDatabase().drafts.delete(ACTIVE_DRAFT_ID);
  }
};
