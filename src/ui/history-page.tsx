import { useState } from 'react';
import type { Exercise, Template, Workout, WorkoutSet } from '../db/entities';
import type { WorkoutRepositoryPort } from '../domain/workout-repository-port';
import { validateWorkoutDraft } from '../domain/workout-service';

type Props = { workouts: Workout[]; repository: Pick<WorkoutRepositoryPort, 'save' | 'remove'>; templates?: Template[]; exercises?: Exercise[]; now?: () => string; onChanged?: () => void; confirmDelete?: () => boolean };

function toDateInput(date: string): string {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? '' : new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function emptySet(): WorkoutSet { return {}; }

function getExerciseName(exerciseId: string, exercises: Exercise[]): string {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Удалённое упражнение';
}

export function HistoryPage({ workouts, repository, templates = [], exercises = [], now = () => new Date().toISOString(), onChanged, confirmDelete = () => window.confirm('Удалить эту тренировку?') }: Props) {
  const [editing, setEditing] = useState<Workout>();
  const [status, setStatus] = useState<string>();
  const [period, setPeriod] = useState('all');
  const [templateId, setTemplateId] = useState('all');
  const [exerciseId, setExerciseId] = useState('all');

  const filteredWorkouts = workouts.filter((workout) => {
    const workoutTime = new Date(workout.date).getTime();
    const currentTime = new Date(now()).getTime();
    const days = period === 'all' ? undefined : Number(period);
    const inPeriod = days === undefined || (workoutTime <= currentTime && currentTime - workoutTime <= days * 86_400_000);
    const hasTemplate = templateId === 'all' || workout.templateId === templateId;
    const hasExercise = exerciseId === 'all' || workout.exercises.some((exercise) => exercise.exerciseId === exerciseId);
    return inPeriod && hasTemplate && hasExercise;
  });

  function updateSet(exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, rawValue: string): void {
    if (!editing) return;
    const value = rawValue === '' ? undefined : Number(rawValue);
    setEditing({ ...editing, exercises: editing.exercises.map((exercise, currentExercise) => currentExercise !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((set, currentSet) => {
      if (currentSet !== setIndex) return set;
      if (typeof value === 'number') return { ...set, [field]: value };
      const nextSet = { ...set };
      delete nextSet[field];
      return nextSet;
    }) }) });
  }

  async function saveEditing(): Promise<void> {
    if (!editing) return;
    const date = new Date(editing.date);
    if (Number.isNaN(date.getTime())) {
      setStatus('Дата тренировки указана неверно');
      return;
    }
    const workout = { ...editing, date: date.toISOString() };
    const { id: _id, ...draft } = workout;
    const errors = validateWorkoutDraft(draft);
    if (errors.length > 0) {
      setStatus(errors[0]);
      return;
    }
    await repository.save(workout);
    setEditing(undefined);
    setStatus('Тренировка обновлена');
    onChanged?.();
  }

  async function removeWorkout(workout: Workout): Promise<void> {
    if (!confirmDelete()) return;
    await repository.remove(workout.id);
    setStatus('Тренировка удалена');
    onChanged?.();
  }

  function addExercise(exerciseIdToAdd: string): void {
    if (!editing || !exerciseIdToAdd || editing.exercises.some((exercise) => exercise.exerciseId === exerciseIdToAdd)) return;
    setEditing({ ...editing, exercises: [...editing.exercises, { exerciseId: exerciseIdToAdd, order: editing.exercises.length, sets: [emptySet()] }] });
  }

  if (editing) { const availableExercises = exercises.filter((exercise) => !editing.exercises.some((item) => item.exerciseId === exercise.id)); return <section className="content-page" aria-labelledby="edit-workout-title"><header className="page-header"><div><p className="eyebrow">Журнал</p><h1 id="edit-workout-title">Редактирование тренировки</h1><p className="muted">Исправь результаты уже завершённой тренировки</p></div><button className="secondary-button" type="button" onClick={() => setEditing(undefined)}>Назад</button></header><div className="chart-card edit-workout-form"><label>Дата и время<input aria-label="Дата тренировки" type="datetime-local" value={toDateInput(editing.date)} onChange={(event) => { const value = event.target.value; setEditing({ ...editing, date: value ? new Date(value).toISOString() : '' }); }} /></label>{editing.exercises.map((exercise, exerciseIndex) => { const name = getExerciseName(exercise.exerciseId, exercises); return <article className="workout-card" key={`${exercise.exerciseId}-${exerciseIndex}`}><h2>{name}</h2><button className="set-check exercise-delete-button" type="button" aria-label={`Удалить упражнение ${name}`} onClick={() => setEditing({ ...editing, exercises: editing.exercises.filter((_, index) => index !== exerciseIndex).map((item, order) => ({ ...item, order })) })}>Удалить упражнение</button>{exercise.sets.map((set, setIndex) => <div className="set-row" key={setIndex}><span className="set-number">{setIndex + 1}</span><input aria-label={`Вес подхода ${setIndex + 1} для ${name}`} placeholder="кг" type="number" min="0" step="0.5" value={set.weight ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)} /><input aria-label={`Повторы подхода ${setIndex + 1} для ${name}`} placeholder="повт." type="number" min="0" value={set.reps ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} /><input aria-label={`Время подхода ${setIndex + 1} для ${name}`} placeholder="сек" type="number" min="0" value={set.time ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'time', event.target.value)} /><input aria-label={`Расстояние подхода ${setIndex + 1} для ${name}`} placeholder="км" type="number" min="0" step="0.1" value={set.distance ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'distance', event.target.value)} /><input aria-label={`Отдых после подхода ${setIndex + 1} для ${name}`} placeholder="отдых" type="number" min="0" value={set.rest ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'rest', event.target.value)} /><button className="set-check" type="button" aria-label={`Удалить подход ${setIndex + 1} для ${name}`} disabled={exercise.sets.length === 1} onClick={() => setEditing({ ...editing, exercises: editing.exercises.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: item.sets.filter((_, currentSet) => currentSet !== setIndex) }) })}>×</button></div>)}<button className="add-set" type="button" onClick={() => setEditing({ ...editing, exercises: editing.exercises.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: [...item.sets, emptySet()] }) })}>＋ Добавить подход</button></article>; })}{availableExercises.length > 0 && <div className="edit-exercise-picker"><select aria-label="Новое упражнение" defaultValue=""><option value="" disabled>Выбери упражнение</option>{availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select><button className="secondary-button" type="button" onClick={(event) => { const select = event.currentTarget.previousElementSibling; if (select instanceof HTMLSelectElement) { addExercise(select.value); select.value = ''; } }}>Добавить упражнение</button></div>}<label className="notes-field">Заметки тренировки<textarea aria-label="Заметки тренировки" value={editing.notes ?? ''} onChange={(event) => setEditing({ ...editing, notes: event.target.value || undefined })} /></label>{status && <p className="error-message" role="alert">{status}</p>}<button className="primary-submit" type="button" onClick={() => void saveEditing()}>Сохранить изменения</button></div></section>; }

  return <section className="content-page" aria-labelledby="history-title"><header className="page-header"><div><p className="eyebrow">Журнал</p><h1 id="history-title">История</h1><p className="muted">Все завершённые тренировки</p></div></header><div className="history-filters"><label>Период<select aria-label="Период" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Всё время</option><option value="7">Последние 7 дней</option><option value="30">Последние 30 дней</option><option value="90">Последние 90 дней</option></select></label><label>Шаблон<select aria-label="Шаблон" value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="all">Все шаблоны</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label>Упражнение<select aria-label="Упражнение" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}><option value="all">Все упражнения</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label></div><div className="history-list">{filteredWorkouts.map((workout) => { const title = workout.templateId ? 'Тренировка по шаблону' : 'Свободная тренировка'; return <article className="history-card" key={workout.id}><button className="history-card-main" type="button" aria-label={`Открыть тренировку ${title}`} onClick={() => { setStatus(undefined); setEditing(workout); }}><div className="history-date"><strong>{new Date(workout.date).getDate()}</strong><span>{new Date(workout.date).toLocaleDateString('ru-RU', { month: 'short' })}</span></div><div><h3>{title}</h3><p className="muted">{workout.exercises.length} упражнений · {workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} подходов</p></div><span className="recent-chevron">›</span></button><button className="set-check history-delete-button" type="button" aria-label={`Удалить тренировку ${title}`} onClick={() => void removeWorkout(workout)}>×</button></article>; })}{filteredWorkouts.length === 0 && <div className="empty-state"><span>◌</span><strong>Ничего не найдено</strong><p>Измени параметры фильтра или сохрани первую тренировку.</p></div>}</div>{status && <p className="saved-message" role="status">{status}</p>}</section>;
}
