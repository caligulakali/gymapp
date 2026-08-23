import { describe, expect, it } from 'vitest';
import type { Exercise, Template, Workout } from '../../src/db/entities';
import {
  exportCsv,
  exportJson,
  exportGymApp,
  importGymApp,
  type ExportData
} from '../../src/domain/data-transfer-service';

const exercises: Exercise[] = [{
  id: 'squat',
  name: 'Присед, "классика"',
  muscleGroup: 'legs',
  type: 'strength',
  unit: 'kg',
  restSeconds: 90,
  favourite: true
}];

const templates: Template[] = [{
  id: 'legs-day',
  name: 'Ноги',
  exercises: [{ exerciseId: 'squat', order: 0, sets: 3, targetReps: 8, targetWeight: 100 }]
}];

const workouts: Workout[] = [{
  id: 'workout-1',
  templateId: 'legs-day',
  date: '2026-08-18T10:00:00.000Z',
  notes: 'Хорошая техника',
  exercises: [{
    exerciseId: 'squat',
    order: 0,
    sets: [{ weight: 100, reps: 8, rest: 90, completed: true }]
  }]
}];

const data: ExportData = { exercises, templates, workouts };

describe('data transfer service', () => {
  it('round-trips a gymapp export without changing data', () => {
    const exported = exportGymApp(data, '2026-08-18T12:00:00.000Z');

    expect(importGymApp(exported)).toEqual(data);
  });

  it('imports a legacy version 1 exercise without a rest duration', () => {
    const legacyExercise = { ...exercises[0] };
    delete legacyExercise.restSeconds;
    const payload = JSON.stringify({
      format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z',
      exercises: [legacyExercise], templates, workouts
    });

    expect(importGymApp(payload).exercises).toEqual([legacyExercise]);
  });

  it('imports a legacy version 1 workout without a completion mark', () => {
    const legacyWorkout = structuredClone(workouts[0]);
    delete legacyWorkout.exercises[0].sets[0].completed;
    const payload = JSON.stringify({
      format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z',
      exercises, templates, workouts: [legacyWorkout]
    });

    expect(importGymApp(payload).workouts).toEqual([legacyWorkout]);
  });

  it('exports a complete JSON copy without mutating input', () => {
    const snapshot = structuredClone(data);

    expect(JSON.parse(exportJson(data))).toEqual(data);
    expect(data).toEqual(snapshot);
  });

  it('exports workout sets as escaped CSV rows', () => {
    const csv = exportCsv(data);

    expect(csv).toContain('workoutId,date,templateId,exerciseId,order,set,weight,reps,time,distance,rest,notes,completed');
    expect(csv).toContain('exerciseId,name,equipment,muscleGroup,type,unit,favourite,notes,restSeconds');
    expect(csv).toContain('squat,"\u041f\u0440\u0438\u0441\u0435\u0434, ""\u043a\u043b\u0430\u0441\u0441\u0438\u043a\u0430""",,legs,strength,kg,true,,90');
    expect(csv).toContain('"Присед, ""классика"""');
    expect(csv).toContain('workout-1,2026-08-18T10:00:00.000Z,legs-day,squat,0,1,100,8,,,90,Хорошая техника,true');
  });

  it.each([
    '=HYPERLINK("https://example.invalid","x")',
    '+SUM(1,2)',
    '-SUM(1,2)',
    '@SUM(1,2)',
    ' \t=SUM(1,2)',
    '\uFEFF@SUM(1,2)'
  ])('neutralizes formula-like text in CSV: %s', (name) => {
    const csv = exportCsv({
      ...data,
      exercises: [{ ...exercises[0], name }],
      workouts: [{ ...workouts[0], exercises: [{ ...workouts[0].exercises[0], sets: [{ weight: -1 }] }] }]
    });

    const safeName = name.replace(/^([\u0000-\u0020\u007f-\u009f\uFEFF]*)(?=[=+@-])/u, "$1'");
    const encodedName = `"${safeName.replaceAll('"', '""')}"`;
    expect(csv).toContain(encodedName);
    expect(csv).toContain('workout-1,2026-08-18T10:00:00.000Z,legs-day,squat,0,1,-1');
  });

  it('rejects malformed, unsupported, and duplicate data', () => {
    expect(() => importGymApp('{"format":"other","version":1}')).toThrow('формат');
    expect(() => importGymApp(JSON.stringify({ format: 'gymapp', version: 2, exercises: [], templates: [], workouts: [] }))).toThrow('версия');
    expect(() => importGymApp(JSON.stringify({ format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z', exercises: [{ ...exercises[0], id: 'squat' }, exercises[0]], templates: [], workouts: [] }))).toThrow('дубликат');
  });

  it.each([0, -1, 1.5, 3601, Number.MAX_SAFE_INTEGER + 1, 1e308, Number.NaN, Number.POSITIVE_INFINITY, '90'])('rejects an invalid imported rest duration: %s', (restSeconds) => {
    const payload = JSON.stringify({
      format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z',
      exercises: [{ ...exercises[0], restSeconds }], templates: [], workouts: []
    });

    expect(() => importGymApp(payload)).toThrow('время отдыха');
  });

  it.each(['true', 0, null])('rejects an invalid imported completion mark: %s', (completed) => {
    const payload = JSON.stringify({
      format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z', exercises: [], templates: [],
      workouts: [{ ...workouts[0], exercises: [{ ...workouts[0].exercises[0], sets: [{ completed }] }] }]
    });

    expect(() => importGymApp(payload)).toThrow('выполнения подхода');
  });
});
