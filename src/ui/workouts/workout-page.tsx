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

function pluralize(count: number, forms: [string, string, string]): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function WorkoutPage({ workoutRepository, templateRepository, exerciseRepository, createId, now, onSaved, draftRepository, confirmDiscard = () => window.confirm('Удалить текущий черновик?') }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [active, setActive] = useState<Workout>();
  const [expandedExerciseId, setExpandedExerciseId] = useState<string>();
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(!draftRepository);
  const [draftError, setDraftError] = useState<string>();
  const draftSaveQueue = useRef(Promise.resolve());
  const isDiscarding = useRef(false);

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
          setExpandedExerciseId(draft.exercises[0]?.exerciseId);
        }
      }
      setDraftLoaded(true);
    }).catch(() => setDraftLoaded(true));
  }, [draftRepository]);

  function scheduleDraft(nextActive: Workout, nextNotes: string): void {
    if (isDiscarding.current) return;
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
    isDiscarding.current = false;
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
    setExpandedExerciseId(nextActive.exercises[0]?.exerciseId);
    setNotes('');
    setSaved(false);
  }

  function addExercise(exerciseId: string) {
    if (!active || active.exercises.some((item) => item.exerciseId === exerciseId)) return;
    updateActive({ ...active, exercises: [...active.exercises, { exerciseId, order: active.exercises.length, sets: [emptySet()] }] });
    setExpandedExerciseId(exerciseId);
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
    isDiscarding.current = true;
    setActive(undefined);
    setNotes('');
    setSaved(false);
    setExpandedExerciseId(undefined);
    draftSaveQueue.current = draftSaveQueue.current
      .then(() => draftRepository?.clearDraft())
      .then(() => setDraftError(undefined))
      .catch(() => setDraftError('Не удалось удалить черновик'));
    await draftSaveQueue.current;
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
      <header className="page-header active-workout-header"><div><p className="eyebrow"><span className="live-dot" /> В процессе</p><h1 id="active-workout-title">Тренировка: {activeTemplate?.name ?? 'Свободная'}</h1><p className="muted">Все изменения автоматически сохраняются в черновик</p></div><div className="workout-header-actions"><button className="ghost-button danger-button" type="button" onClick={() => void discardDraft()}>Отменить черновик</button></div></header>
      <div className="workout-overview" aria-label="Состав тренировки"><span><strong>{active.exercises.length}</strong><small>{pluralize(active.exercises.length, ['упражнение', 'упражнения', 'упражнений'])}</small></span><i /><span><strong>{active.exercises.reduce((sum, item) => sum + item.sets.length, 0)}</strong><small>{pluralize(active.exercises.reduce((sum, item) => sum + item.sets.length, 0), ['подход', 'подхода', 'подходов'])}</small></span><span className="autosave-status"><b>✓</b> Черновик сохранён</span></div>
      <form onSubmit={(event) => void save(event)}>
        <div className="workout-exercises">{active.exercises.map((item, exerciseIndex) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          const name = exercise?.name ?? 'Удалённое упражнение';
          const isExpanded = expandedExerciseId === item.exerciseId;
          const panelId = `workout-exercise-${item.exerciseId}`;
          return <article className={`workout-card focused-workout-card${isExpanded ? ' is-expanded' : ''}`} key={item.exerciseId}><div className="workout-card-heading"><div><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><span className="workout-card-title"><h2>{name}</h2><small>{item.sets.length} {pluralize(item.sets.length, ['подход', 'подхода', 'подходов'])}{exercise && ` · ${getMuscleGroupLabel(exercise.muscleGroup)}`}</small></span></div><button className="workout-collapse" type="button" aria-label={`${isExpanded ? 'Свернуть' : 'Развернуть'} ${name}`} aria-expanded={isExpanded} aria-controls={panelId} onClick={() => setExpandedExerciseId(isExpanded ? undefined : item.exerciseId)}><span aria-hidden="true">⌄</span></button></div>{isExpanded && <div className="workout-card-body" id={panelId}><div className="set-header"><span>№</span><span>Вес, кг</span><span>Повторы</span><span>Дополнительно</span></div>{item.sets.map((set, setIndex) => <div className="set-row" key={setIndex}><span className="set-number">{setIndex + 1}</span><input aria-label={`Вес подхода ${setIndex + 1} для ${name}`} inputMode="decimal" placeholder="—" type="number" min="0" step="0.5" value={set.weight ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)} /><input aria-label={`Повторы подхода ${setIndex + 1} для ${name}`} inputMode="numeric" placeholder="—" type="number" min="0" value={set.reps ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'reps', event.target.value)} /><input aria-label={`Время подхода ${setIndex + 1} для ${name}`} inputMode="numeric" placeholder="сек" type="number" min="0" value={set.time ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'time', event.target.value)} /><input aria-label={`Расстояние подхода ${setIndex + 1} для ${name}`} inputMode="decimal" placeholder="км" type="number" min="0" step="0.1" value={set.distance ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'distance', event.target.value)} /><input aria-label={`Отдых после подхода ${setIndex + 1} для ${name}`} inputMode="numeric" placeholder="отдых" type="number" min="0" value={set.rest ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, 'rest', event.target.value)} /><button className="set-check" type="button" aria-label={`Удалить подход ${setIndex + 1} для ${name}`} onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: current.sets.filter((_, currentSet) => currentSet !== setIndex) }) })}>×</button></div>)}<button className="add-set" type="button" onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: [...current.sets, emptySet()] }) })}>＋ Добавить подход</button></div>}</article>;
        })}</div>
        {availableExercises.length > 0 && <section className="add-exercise-row exercise-selector" aria-labelledby="exercise-selector-title"><div className="exercise-selector-heading"><div><p className="eyebrow">Следующий шаг</p><h2 id="exercise-selector-title">Добавить упражнение</h2></div><span>{availableExercises.length}</span></div><p>Выберите из своего справочника — новое упражнение сразу появится в тренировке.</p><div className="exercise-choice-grid">{availableExercises.map((exercise) => <button className="chip-button exercise-choice" type="button" key={exercise.id} aria-label={`Добавить ${exercise.name}`} onClick={() => addExercise(exercise.id)}><span className="exercise-choice-icon" aria-hidden="true">＋</span><span><strong>{exercise.name}</strong><small>{getMuscleGroupLabel(exercise.muscleGroup)}</small></span></button>)}</div></section>}
        {availableExercises.length === 0 && active.exercises.length === 0 && <section className="exercise-selector compact-empty-selector" aria-labelledby="exercise-selector-title"><div className="exercise-selector-heading"><div><p className="eyebrow">Нужен справочник</p><h2 id="exercise-selector-title">Нет доступных упражнений</h2></div></div><p>Добавь упражнения в справочник, затем вернись к тренировке.</p></section>}
        <label className="notes-field workout-notes">Заметки тренировки<textarea aria-label="Заметки тренировки" placeholder="Как прошла тренировка?" value={notes} onChange={(event) => { const nextNotes = event.target.value; setNotes(nextNotes); scheduleDraft(active, nextNotes); }} /></label><div className="workout-finish-bar"><span><strong>Готово?</strong><small>Проверь подходы перед сохранением</small></span><button className="primary-submit" type="submit">Завершить и сохранить тренировку</button></div>{saved && <p className="saved-message">Тренировка сохранена</p>}
      </form>
    </section>
  );
}
