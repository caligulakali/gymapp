import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Exercise, Template, Workout, WorkoutSet } from '../../db/entities';
import { getMuscleGroupLabel } from '../../domain/muscle-groups';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../../domain/template-repository-port';
import type { WorkoutRepositoryPort } from '../../domain/workout-repository-port';
import type { WorkoutDraftRepositoryPort } from '../../domain/workout-draft-repository-port';
import { validateWorkoutDraft } from '../../domain/workout-service';

type Props = {
  workoutRepository: WorkoutRepositoryPort;
  templateRepository: TemplateRepositoryPort;
  exerciseRepository: ExerciseRepositoryPort;
  createId: () => string;
  now: () => string;
  onSaved?: () => void;
  draftRepository?: WorkoutDraftRepositoryPort;
  confirmDiscard?: () => boolean;
};

const emptySet = (): WorkoutSet => ({});

export function WorkoutPage({ workoutRepository, templateRepository, exerciseRepository, createId, now, onSaved, draftRepository, confirmDiscard = () => window.confirm('Удалить текущий черновик?') }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [active, setActive] = useState<Workout>();
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(!draftRepository);
  const [draftError, setDraftError] = useState<string>();
  const draftSaveQueue = useRef(Promise.resolve());

  useEffect(() => {
    void Promise.all([templateRepository.getAll(), exerciseRepository.getAll()]).then(([nextTemplates, nextExercises]) => {
      setTemplates(nextTemplates);
      setExercises(nextExercises);
    });
  }, [templateRepository, exerciseRepository]);

  useEffect(() => {
    if (!draftRepository) return;
    void draftRepository.getDraft().then((draft) => {
      if (draft) {
        const { id: _id, ...draftData } = draft;
        const errors = validateWorkoutDraft(draftData);
        if (errors.length > 0) {
          setDraftError(`Черновик повреждён: ${errors[0]}`);
          void draftRepository.clearDraft();
        } else {
          setActive(draft);
          setNotes(draft.notes ?? '');
        }
      }
      setDraftLoaded(true);
    }).catch(() => setDraftLoaded(true));
  }, [draftRepository]);

  function scheduleDraft(nextActive: Workout, nextNotes: string): void {
    const snapshot = { ...nextActive, notes: nextNotes || undefined };
    if (!draftRepository || !draftLoaded) return;
    draftSaveQueue.current = draftSaveQueue.current
      .then(() => draftRepository.saveDraft(snapshot))
      .then(() => setDraftError(undefined))
      .catch(() => setDraftError('Не удалось сохранить черновик'));
  }

  function updateActive(nextActive: Workout, nextNotes = notes): void {
    setActive(nextActive);
    scheduleDraft(nextActive, nextNotes);
  }

  function start(template?: Template) {
    const nextActive: Workout = {
      id: createId(),
      templateId: template?.id,
      date: now(),
      exercises: template?.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        order: item.order,
        sets: Array.from({ length: item.sets }, () => ({ reps: item.targetReps, weight: item.targetWeight }))
      })) ?? []
    };
    updateActive(nextActive, '');
    setNotes('');
    setSaved(false);
  }

  function addExercise(exerciseId: string) {
    if (!active || active.exercises.some((item) => item.exerciseId === exerciseId)) return;
    updateActive({ ...active, exercises: [...active.exercises, { exerciseId, order: active.exercises.length, sets: [emptySet()] }] });
  }

  function updateSet(exerciseIndex: number, setIndex: number, key: keyof WorkoutSet, value: string) {
    if (!active) return;
    const parsedValue = value === '' ? undefined : Number(value);
    if (typeof parsedValue === 'number' && !Number.isFinite(parsedValue)) return;
    const nextActive: Workout = {
      ...active,
      exercises: active.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set, current) => {
          if (current !== setIndex) return set;
          if (typeof parsedValue === 'number') return { ...set, [key]: parsedValue };
          const nextSet = { ...set };
          delete nextSet[key];
          return nextSet;
        })
      })
    };
    updateActive(nextActive);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    const workout = { ...active, notes: notes || undefined };
    const { id: _id, ...draftData } = workout;
    const errors = validateWorkoutDraft(draftData);
    if (errors.length > 0) {
      setDraftError(errors[0]);
      return;
    }
    await draftSaveQueue.current;
    await workoutRepository.save(workout);
    await draftRepository?.clearDraft();
    setDraftError(undefined);
    setSaved(true);
    onSaved?.();
  }

  async function discardDraft(): Promise<void> {
    if (!confirmDiscard()) return;
    await draftSaveQueue.current;
    await draftRepository?.clearDraft();
    setActive(undefined);
    setNotes('');
    setSaved(false);
  }

  if (!draftLoaded) {
    return <section className="content-page"><p className="muted">Восстанавливаем черновик…</p></section>;
  }

  if (!active) {
    return (
      <section className="content-page workout-picker" aria-labelledby="workout-picker-title">
        <header className="page-header"><div><p className="eyebrow">Тренировка</p><h1 id="workout-picker-title">Начать тренировку</h1><p className="muted">Выбери готовый сценарий или начни с чистого листа.</p></div></header>{draftError && <p className="error-message" role="alert">{draftError}</p>}
        <div className="workout-start-options"><button className="hero-start start-option" type="button" onClick={() => start()}><span className="hero-icon" aria-hidden="true">＋</span><span><strong>Пустая тренировка</strong><small>Добавь упражнения по ходу</small></span><span className="hero-arrow" aria-hidden="true">→</span></button></div>
        <div className="picker-section-heading"><div><p className="eyebrow">Быстрый старт</p><h2 className="picker-title">Твои шаблоны</h2></div><span className="picker-count">{templates.length}</span></div>
        <div className="template-picker">
          {templates.map((template) => <button className="picker-card" key={template.id} type="button" aria-label={`Начать тренировку по шаблону ${template.name}`} onClick={() => start(template)}><span className="template-picker-icon" aria-hidden="true">▦</span><span className="picker-card-copy"><strong>{template.name}</strong><small>{template.exercises.length} упражнений</small></span><span className="picker-card-arrow" aria-hidden="true">›</span></button>)}
          {templates.length === 0 && <p className="empty-picker">Создай шаблон в разделе «Шаблоны», чтобы запускать его в один клик.</p>}
        </div>
      </section>
    );
  }

  const activeTemplate = templates.find((item) => item.id === active.templateId);
  const availableExercises = exercises.filter((exercise) => !active.exercises.some((item) => item.exerciseId === exercise.id));

  return (
    <section className="content-page workout-page" aria-labelledby="active-workout-title">
      <header className="page-header"><div><p className="eyebrow">В процессе</p><h1 id="active-workout-title">Тренировка: {activeTemplate?.name ?? 'Свободная'}</h1><p className="muted">{active.exercises.length} упражнений · {active.exercises.reduce((sum, item) => sum + item.sets.length, 0)} подходов</p></div><div className="workout-header-actions"><button className="secondary-button" type="button" onClick={() => void discardDraft()}>Отменить черновик</button></div></header>
      <form onSubmit={(event) => void save(event)}>
        <div className="workout-exercises">{active.exercises.map((item, exerciseIndex) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          const name = exercise?.name ?? 'Удалённое упражнение';
          return <article className="workout-card" key={item.exerciseId}><div className="workout-card-heading"><div><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><h2>{name}</h2></div><span className="muted">{item.sets.length} подхода</span></div><div className="set-header"><span>Подход</span><span>Вес</span><span>Повторы</span><span>Дополнительно</span></div>{item.sets.map((set, setIndex) => <div className="set-row" key={setIndex}><span className="set-number">{setIndex + 1}</span><input aria-label={`Вес подхода ${setIndex + 1} для ${name}`} type="number" min="0" step="0.5" value={set.weight ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)} /><input aria-label={`Повторы подхода ${setIndex + 1} для ${name}`} type="number" min="0" value={set.reps ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} /><input aria-label={`Время подхода ${setIndex + 1} для ${name}`} type="number" min="0" value={set.time ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'time', event.target.value)} /><input aria-label={`Расстояние подхода ${setIndex + 1} для ${name}`} type="number" min="0" step="0.1" value={set.distance ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'distance', event.target.value)} /><input aria-label={`Отдых после подхода ${setIndex + 1} для ${name}`} type="number" min="0" value={set.rest ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'rest', event.target.value)} /><button className="set-check" type="button" aria-label={`Удалить подход ${setIndex + 1} для ${name}`} onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: current.sets.filter((_, currentSet) => currentSet !== setIndex) }) })}>×</button></div>)}<button className="add-set" type="button" onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: [...current.sets, emptySet()] }) })}>＋ Добавить подход</button></article>;
        })}</div>
        <section className="add-exercise-row exercise-selector" aria-labelledby="exercise-selector-title"><div className="exercise-selector-heading"><div><p className="eyebrow">Следующий шаг</p><h2 id="exercise-selector-title">Добавить упражнение</h2></div><span>{availableExercises.length}</span></div><p>Выберите из своего справочника — новое упражнение сразу появится в тренировке.</p><div className="exercise-choice-grid">{availableExercises.map((exercise) => <button className="chip-button exercise-choice" type="button" key={exercise.id} aria-label={`Добавить ${exercise.name}`} onClick={() => addExercise(exercise.id)}><span className="exercise-choice-icon" aria-hidden="true">＋</span><span><strong>{exercise.name}</strong><small>{getMuscleGroupLabel(exercise.muscleGroup)}</small></span></button>)}</div>{availableExercises.length === 0 && <p className="empty-picker">Все упражнения из справочника уже добавлены.</p>}</section>
        <label className="notes-field">Заметки тренировки<textarea aria-label="Заметки тренировки" value={notes} onChange={(event) => { const nextNotes = event.target.value; setNotes(nextNotes); scheduleDraft(active, nextNotes); }} /></label><button className="primary-submit" type="submit">Завершить и сохранить тренировку</button>{saved && <p className="saved-message">Тренировка сохранена</p>}
      </form>
    </section>
  );
}
