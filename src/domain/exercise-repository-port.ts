import type { Exercise } from '../db/entities';

export interface ExerciseRepositoryPort {
  getAll(): Promise<Exercise[]>;
  save(exercise: Exercise): Promise<void>;
  remove(id: string): Promise<void>;
}
