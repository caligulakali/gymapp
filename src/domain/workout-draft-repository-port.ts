import type { Workout } from '../db/entities';

export interface WorkoutDraftRepositoryPort {
  getDraft(): Promise<Workout | undefined>;
  saveDraft(workout: Workout): Promise<void>;
  clearDraft(): Promise<void>;
}
