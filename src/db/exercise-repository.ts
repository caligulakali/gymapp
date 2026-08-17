import type { Exercise } from './entities';
import { closeDatabase, getDatabase, resetDatabase } from './database';

export const exerciseRepository = {
  async save(exercise: Exercise): Promise<void> {
    await getDatabase().exercises.put(exercise);
  },

  async getAll(): Promise<Exercise[]> {
    return getDatabase().exercises.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Exercise | undefined> {
    return getDatabase().exercises.get(id);
  },

  async remove(id: string): Promise<void> {
    await getDatabase().exercises.delete(id);
  }
};

export { closeDatabase, resetDatabase };
