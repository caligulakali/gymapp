import type { Equipment, Exercise, ExerciseType, Template, TemplateExercise, WeightUnit, Workout, WorkoutExercise, WorkoutSet } from '../db/entities';
import { isValidRestSeconds } from './exercise-service';

export interface ExportData {
  exercises: Exercise[];
  templates: Template[];
  workouts: Workout[];
}

interface GymAppFile extends ExportData {
  format: 'gymapp';
  version: 1;
  exportedAt: string;
}

const EXERCISE_TYPES: readonly ExerciseType[] = ['strength', 'cardio', 'time', 'reps'];
const WEIGHT_UNITS: readonly WeightUnit[] = ['kg'];
const EQUIPMENT_TYPES: readonly Equipment[] = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'cable', 'kettlebell', 'other'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function requireId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} имеет неверный идентификатор`);
}

function validateSet(value: unknown): value is WorkoutSet {
  if (!isRecord(value)) throw new Error('Подход указан неверно');
  for (const field of ['weight', 'reps', 'time', 'distance', 'rest'] as const) {
    if (field in value && !isFiniteNumber(value[field])) throw new Error(`Поле ${field} в подходе указано неверно`);
  }
  if ('completed' in value && typeof value.completed !== 'undefined' && typeof value.completed !== 'boolean') {
    throw new Error('Отметка выполнения подхода указана неверно');
  }
  return true;
}

function validateExercise(value: unknown): value is Exercise {
  if (!isRecord(value)) throw new Error('Упражнение указано неверно');
  requireId(value.id, 'Упражнение');
  if (typeof value.name !== 'string' || value.name.trim() === '') throw new Error('Упражнение имеет неверное название');
  if (typeof value.muscleGroup !== 'string' || value.muscleGroup.trim() === '') throw new Error('Упражнение имеет неверную мышечную группу');
  if (!EXERCISE_TYPES.includes(value.type as ExerciseType)) throw new Error('Упражнение имеет неверный тип');
  if (!WEIGHT_UNITS.includes(value.unit as WeightUnit)) throw new Error('Упражнение имеет неверную единицу веса');
  if ('equipment' in value && typeof value.equipment !== 'undefined' && !EQUIPMENT_TYPES.includes(value.equipment as Equipment)) throw new Error('Упражнение имеет неверный снаряд');
  if (typeof value.favourite !== 'boolean') throw new Error('Признак избранного упражнения указан неверно');
  if ('notes' in value && typeof value.notes !== 'undefined' && typeof value.notes !== 'string') throw new Error('Заметка упражнения указана неверно');
  if ('restSeconds' in value && typeof value.restSeconds !== 'undefined' && !isValidRestSeconds(value.restSeconds)) throw new Error('Упражнение имеет неверное время отдыха');
  return true;
}

function validateTemplateExercise(value: unknown): value is TemplateExercise {
  if (!isRecord(value)) throw new Error('Упражнение шаблона указано неверно');
  requireId(value.exerciseId, 'Упражнение шаблона');
  if (!Number.isInteger(value.order) || (value.order as number) < 0) throw new Error('Порядок упражнения шаблона указан неверно');
  if (!Number.isInteger(value.sets) || (value.sets as number) <= 0) throw new Error('Количество подходов шаблона указано неверно');
  for (const field of ['targetReps', 'targetWeight'] as const) {
    if (field in value && typeof value[field] !== 'undefined' && !isFiniteNumber(value[field])) throw new Error(`Поле ${field} шаблона указано неверно`);
  }
  return true;
}

function validateTemplate(value: unknown): value is Template {
  if (!isRecord(value)) throw new Error('Шаблон указан неверно');
  requireId(value.id, 'Шаблон');
  if (typeof value.name !== 'string' || value.name.trim() === '') throw new Error('Шаблон имеет неверное название');
  if (!Array.isArray(value.exercises) || value.exercises.some((item) => !validateTemplateExercise(item))) throw new Error('Список упражнений шаблона указан неверно');
  if ('notes' in value && typeof value.notes !== 'undefined' && typeof value.notes !== 'string') throw new Error('Заметка шаблона указана неверно');
  return true;
}

function validateWorkoutExercise(value: unknown): value is WorkoutExercise {
  if (!isRecord(value)) throw new Error('Упражнение тренировки указано неверно');
  requireId(value.exerciseId, 'Упражнение тренировки');
  if (!Number.isInteger(value.order) || (value.order as number) < 0) throw new Error('Порядок упражнения тренировки указан неверно');
  if (!Array.isArray(value.sets) || value.sets.length === 0 || value.sets.some((item) => !validateSet(item))) throw new Error('Список подходов тренировки указан неверно');
  return true;
}

function validateWorkout(value: unknown): value is Workout {
  if (!isRecord(value)) throw new Error('Тренировка указана неверно');
  requireId(value.id, 'Тренировка');
  if (typeof value.date !== 'string' || Number.isNaN(new Date(value.date).getTime())) throw new Error('Дата тренировки указана неверно');
  if (!Array.isArray(value.exercises) || value.exercises.some((item) => !validateWorkoutExercise(item))) throw new Error('Список упражнений тренировки указан неверно');
  if ('templateId' in value && typeof value.templateId !== 'undefined') requireId(value.templateId, 'Шаблон тренировки');
  if ('notes' in value && typeof value.notes !== 'undefined' && typeof value.notes !== 'string') throw new Error('Заметка тренировки указана неверно');
  return true;
}

function assertUniqueIds(items: readonly { id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Найден дубликат идентификатора: ${label}`);
    ids.add(item.id);
  }
}

function validateExportData(value: unknown): asserts value is ExportData {
  if (!isRecord(value) || !Array.isArray(value.exercises) || !Array.isArray(value.templates) || !Array.isArray(value.workouts)) {
    throw new Error('Данные экспорта имеют неверную структуру');
  }
  value.exercises.forEach(validateExercise);
  value.templates.forEach(validateTemplate);
  value.workouts.forEach(validateWorkout);
  assertUniqueIds(value.exercises, 'упражнение');
  assertUniqueIds(value.templates, 'шаблон');
  assertUniqueIds(value.workouts, 'тренировка');
}

export function exportJson(data: ExportData): string {
  validateExportData(data);
  return JSON.stringify(data);
}

export function exportGymApp(data: ExportData, exportedAt: string): string {
  validateExportData(data);
  if (Number.isNaN(new Date(exportedAt).getTime())) throw new Error('Дата экспорта указана неверно');
  const file: GymAppFile = { format: 'gymapp', version: 1, exportedAt, ...data };
  return JSON.stringify(file);
}

export function importGymApp(input: string): ExportData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    throw new Error('Файл импорта содержит некорректный JSON');
  }
  if (!isRecord(parsed) || parsed.format !== 'gymapp') throw new Error('Неверный формат файла');
  if (parsed.version !== 1) throw new Error('Неподдерживаемая версия файла');
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(new Date(parsed.exportedAt).getTime())) throw new Error('Дата экспорта указана неверно');
  validateExportData(parsed);
  return { exercises: parsed.exercises, templates: parsed.templates, workouts: parsed.workouts };
}

function csvCell(value: unknown): string {
  const rawText = value === undefined || value === null ? '' : String(value);
  const text = typeof value === 'string'
    ? rawText.replace(/^([\u0000-\u0020\u007f-\u009f\uFEFF]*)(?=[=+@-])/u, "$1'")
    : rawText;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportCsv(data: ExportData): string {
  validateExportData(data);
  const lines = ['workoutId,date,templateId,exerciseId,order,set,weight,reps,time,distance,rest,notes,completed'];
  for (const workout of data.workouts) {
    for (const exercise of workout.exercises) {
      exercise.sets.forEach((set, index) => lines.push([
        workout.id, workout.date, workout.templateId, exercise.exerciseId, exercise.order, index + 1,
        set.weight, set.reps, set.time, set.distance, set.rest, workout.notes, set.completed
      ].map(csvCell).join(',')));
    }
  }
  lines.push('', 'exerciseId,name,equipment,muscleGroup,type,unit,favourite,notes,restSeconds');
  for (const exercise of data.exercises) {
    lines.push([exercise.id, exercise.name, exercise.equipment, exercise.muscleGroup, exercise.type, exercise.unit, exercise.favourite, exercise.notes, exercise.restSeconds].map(csvCell).join(','));
  }
  return lines.join('\n');
}
