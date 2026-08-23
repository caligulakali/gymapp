import Dexie, { type Table } from 'dexie';
import type { Exercise, Template, Workout } from './entities';

export interface WorkoutDraftRecord {
  id: string;
  workout: Workout;
}

export class GymAppDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  workouts!: Table<Workout, string>;
  drafts!: Table<WorkoutDraftRecord, string>;

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
    this.version(5).stores({
      exercises: 'id, name, muscleGroup, type, favourite',
      templates: 'id, name',
      workouts: 'id, date, templateId',
      drafts: 'id'
    });
    this.version(6)
      .stores({
        exercises: 'id, name, muscleGroup, type, favourite',
        templates: 'id, name',
        workouts: 'id, date, templateId',
        drafts: 'id'
      })
      .upgrade(async (transaction) => {
        await transaction.table('exercises').toCollection().modify((record: Partial<Exercise>) => {
          record.equipment ??= 'other';
        });
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
