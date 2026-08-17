import type { Workout } from '../db/entities';

export interface WorkoutRepositoryPort {
  save(workout: Workout): Promise<void>;
  getAll(): Promise<Workout[]>;
  getById(id: string): Promise<Workout | undefined>;
  remove(id: string): Promise<void>;
}
