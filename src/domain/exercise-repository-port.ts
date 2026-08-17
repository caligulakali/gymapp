import type { Exercise } from '../db/entities';

export interface ExerciseRepositoryPort {
  getAll(): Promise<Exercise[]>;
  getById?: (id: string) => Promise<Exercise | undefined>;
  save(exercise: Exercise): Promise<void>;
  remove(id: string): Promise<void>;
}
