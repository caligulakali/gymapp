import type { Workout } from './entities';
import { getDatabase } from './database';

export const workoutRepository = {
  async save(workout: Workout): Promise<void> {
    await getDatabase().workouts.put(workout);
  },

  async getAll(): Promise<Workout[]> {
    return getDatabase().workouts.orderBy('date').reverse().toArray();
  },

  async getById(id: string): Promise<Workout | undefined> {
    return getDatabase().workouts.get(id);
  },

  async remove(id: string): Promise<void> {
    await getDatabase().workouts.delete(id);
  }
};
