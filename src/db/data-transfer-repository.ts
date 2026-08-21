import { getDatabase } from './database';
import type { DataTransferRepositoryPort } from '../domain/data-transfer-repository-port';
import type { ExportData } from '../domain/data-transfer-service';

export const dataTransferRepository: DataTransferRepositoryPort = {
  async getData(): Promise<ExportData> {
    const database = getDatabase();
    const [exercises, templates, workouts] = await Promise.all([
      database.exercises.toArray(),
      database.templates.toArray(),
      database.workouts.toArray()
    ]);
    return { exercises, templates, workouts };
  },

  async replaceData(data: ExportData): Promise<void> {
    const database = getDatabase();
    await database.transaction('rw', database.exercises, database.templates, database.workouts, database.drafts, async () => {
      await database.exercises.clear();
      await database.templates.clear();
      await database.workouts.clear();
      await database.drafts.clear();
      await database.exercises.bulkPut(data.exercises);
      await database.templates.bulkPut(data.templates);
      await database.workouts.bulkPut(data.workouts);
    });
  }
};
