import Dexie, { type Table } from 'dexie';
import type { Exercise, Template, Workout } from './entities';

export class GymAppDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  workouts!: Table<Workout, string>;

  constructor() {
    super('gymapp');
    this.version(1).stores({ exercises: 'id, name, muscleGroup, type, favourite' });
    this.version(2)
      .stores({ exercises: 'id, name, muscleGroup, type, favourite' })
      .upgrade(async (transaction) => {
        await transaction.table('exercises').toCollection().modify((record: Partial<Exercise>) => {
          record.favourite ??= false;
        });
      });
    this.version(3).stores({
      exercises: 'id, name, muscleGroup, type, favourite',
      templates: 'id, name'
    });
    this.version(4).stores({
      exercises: 'id, name, muscleGroup, type, favourite',
      templates: 'id, name',
      workouts: 'id, date, templateId'
    });
  }
}

let database: GymAppDatabase | undefined;

export function getDatabase(): GymAppDatabase {
  database ??= new GymAppDatabase();
  return database;
}

export async function closeDatabase(): Promise<void> {
  database?.close();
  database = undefined;
}

export async function resetDatabase(): Promise<void> {
  const currentDatabase = getDatabase();
  currentDatabase.close();
  database = undefined;
  await Dexie.delete('gymapp');
}
