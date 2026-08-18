import { useState } from 'react';
import type { Exercise, Template, Workout, WorkoutSet } from '../db/entities';
import type { WorkoutRepositoryPort } from '../domain/workout-repository-port';

type Props = { workouts: Workout[]; repository: Pick<WorkoutRepositoryPort, 'save' | 'remove'>; templates?: Template[]; exercises?: Exercise[]; now?: () => string; onChanged?: () => void; confirmDelete?: () => boolean };

function toDateInput(date: string): string {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? '' : new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function emptySet(): WorkoutSet { return {}; }

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
    setEditing({ ...editing, exercises: editing.exercises.map((exercise, currentExercise) => currentExercise !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((set, currentSet) => currentSet !== setIndex ? set : { ...set, [field]: value }) }) });
  }

  async function saveEditing(): Promise<void> {
    if (!editing) return;
    const date = new Date(editing.date);
    if (Number.isNaN(date.getTime())) return;
    await repository.save({ ...editing, date: date.toISOString() });
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

  if (editing) return <section className="content-page" aria-labelledby="edit-workout-title"><header className="page-header"><div><p className="eyebrow">Журнал</p><h1 id="edit-workout-title">Редактирование тренировки</h1><p className="muted">Исправь результаты уже завершённой тренировки</p></div><button className="secondary-button" type="button" onClick={() => setEditing(undefined)}>Назад</button></header><div className="chart-card edit-workout-form"><label>Дата и время<input aria-label="Дата тренировки" type="datetime-local" value={toDateInput(editing.date)} onChange={(event) => { const value = event.target.value; setEditing({ ...editing, date: value ? new Date(value).toISOString() : '' }); }} /></label>{editing.exercises.map((exercise, exerciseIndex) => <article className="workout-card" key={`${exercise.exerciseId}-${exerciseIndex}`}><h2>{exercise.exerciseId}</h2>{exercise.sets.map((set, setIndex) => <div className="set-row" key={setIndex}><span className="set-number">{setIndex + 1}</span><input aria-label={`Вес подхода ${setIndex + 1} для ${exercise.exerciseId}`} type="number" min="0" step="0.5" value={set.weight ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)} /><input aria-label={`Повторы подхода ${setIndex + 1} для ${exercise.exerciseId}`} type="number" min="0" value={set.reps ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} /><button className="set-check" type="button" aria-label={`Удалить подход ${setIndex + 1} для ${exercise.exerciseId}`} disabled={exercise.sets.length === 1} onClick={() => setEditing({ ...editing, exercises: editing.exercises.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: item.sets.filter((_, currentSet) => currentSet !== setIndex) }) })}>×</button></div>)}<button className="add-set" type="button" onClick={() => setEditing({ ...editing, exercises: editing.exercises.map((item, index) => index !== exerciseIndex ? item : { ...item, sets: [...item.sets, emptySet()] }) })}>＋ Добавить подход</button></article>)}<label className="notes-field">Заметки тренировки<textarea aria-label="Заметки тренировки" value={editing.notes ?? ''} onChange={(event) => setEditing({ ...editing, notes: event.target.value || undefined })} /></label><button className="primary-submit" type="button" onClick={() => void saveEditing()}>Сохранить изменения</button></div></section>;

  return <section className="content-page" aria-labelledby="history-title"><header className="page-header"><div><p className="eyebrow">Журнал</p><h1 id="history-title">История</h1><p className="muted">Все завершённые тренировки</p></div></header><div className="history-filters"><label>Период<select aria-label="Период" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Всё время</option><option value="7">Последние 7 дней</option><option value="30">Последние 30 дней</option><option value="90">Последние 90 дней</option></select></label><label>Шаблон<select aria-label="Шаблон" value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="all">Все шаблоны</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label>Упражнение<select aria-label="Упражнение" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}><option value="all">Все упражнения</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label></div><div className="history-list">{filteredWorkouts.map((workout) => { const title = workout.templateId ? 'Тренировка по шаблону' : 'Свободная тренировка'; return <article className="history-card" key={workout.id}><button className="history-card-main" type="button" aria-label={`Открыть тренировку ${title}`} onClick={() => setEditing(workout)}><div className="history-date"><strong>{new Date(workout.date).getDate()}</strong><span>{new Date(workout.date).toLocaleDateString('ru-RU', { month: 'short' })}</span></div><div><h3>{title}</h3><p className="muted">{workout.exercises.length} упражнений · {workout.exercises.reduce((sum, item) => sum + item.sets.length, 0)} подходов</p></div><span className="recent-chevron">›</span></button><button className="set-check history-delete-button" type="button" aria-label={`Удалить тренировку ${title}`} onClick={() => void removeWorkout(workout)}>×</button></article>; })}{filteredWorkouts.length === 0 && <div className="empty-state"><span>◌</span><strong>Ничего не найдено</strong><p>Измени параметры фильтра или сохрани первую тренировку.</p></div>}</div>{status && <p className="saved-message" role="status">{status}</p>}</section>;
}
