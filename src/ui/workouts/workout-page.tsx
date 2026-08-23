import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Exercise, Template, Workout, WorkoutSet } from '../../db/entities';
import { getMuscleGroupLabel } from '../../domain/muscle-groups';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../../domain/template-repository-port';
import type { WorkoutRepositoryPort } from '../../domain/workout-repository-port';
import type { WorkoutDraftRepositoryPort } from '../../domain/workout-draft-repository-port';
import { validateWorkoutDraft } from '../../domain/workout-service';
import { isValidRestSeconds } from '../../domain/exercise-service';

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

type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type SetMetric = 'weight' | 'reps' | 'time' | 'distance';
type MetricField = { key: SetMetric; label: string; inputMode: 'decimal' | 'numeric'; placeholder: string; step?: string };
type RestTimerState = { exerciseId: string; duration: number; remaining: number; running: boolean; endsAt?: number };

const emptySet = (): WorkoutSet => ({});

function getMetricFields(exercise?: Exercise): MetricField[] {
  const fields: Record<SetMetric, MetricField> = {
    weight: { key: 'weight', label: `Вес, ${exercise?.unit ?? 'kg'}`, inputMode: 'decimal', placeholder: '—', step: '0.5' },
    reps: { key: 'reps', label: 'Повторы', inputMode: 'numeric', placeholder: '—' },
    time: { key: 'time', label: 'Время, сек', inputMode: 'numeric', placeholder: 'сек' },
    distance: { key: 'distance', label: 'Расстояние, км', inputMode: 'decimal', placeholder: 'км', step: '0.1' }
  };
  if (exercise?.type === 'cardio') return [fields.time, fields.distance];
  if (exercise?.type === 'time') return [fields.time];
  if (exercise?.type === 'reps') return [fields.reps];
  return [fields.weight, fields.reps];
}

function getMetricAriaLabel(metric: SetMetric, setNumber: number, exerciseName: string): string {
  const labels: Record<SetMetric, string> = { weight: 'Вес', reps: 'Повторы', time: 'Время', distance: 'Расстояние' };
  return `${labels[metric]} подхода ${setNumber} для ${exerciseName}`;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

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
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');
  const [restTimer, setRestTimer] = useState<RestTimerState>();
  const draftSaveQueue = useRef(Promise.resolve());
  const draftSaveGeneration = useRef(0);
  const isDiscarding = useRef(false);

  useEffect(() => {
    void Promise.all([templateRepository.getAll(), exerciseRepository.getAll()]).then(([nextTemplates, nextExercises]) => {
      setTemplates(nextTemplates);
      setExercises(nextExercises);
    });
  }, [templateRepository, exerciseRepository]);

  useEffect(() => {
    const selectedExercise = exercises.find((exercise) => exercise.id === expandedExerciseId);
    setRestTimer((current) => {
      if (current?.running) return current;
      if (!isValidRestSeconds(selectedExercise?.restSeconds)) return undefined;
      if (current?.exerciseId === selectedExercise.id && current.duration === selectedExercise.restSeconds) return current;
      return { exerciseId: selectedExercise.id, duration: selectedExercise.restSeconds, remaining: selectedExercise.restSeconds, running: false };
    });
  }, [exercises, expandedExerciseId]);

  useEffect(() => {
    if (!restTimer?.running || typeof restTimer.endsAt !== 'number') return;
    const updateRemaining = () => {
      setRestTimer((current) => {
        if (!current?.running || typeof current.endsAt !== 'number') return current;
        const remaining = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
        return remaining === 0 ? { ...current, remaining: 0, running: false, endsAt: undefined } : { ...current, remaining };
      });
    };
    const interval = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(interval);
  }, [restTimer?.endsAt, restTimer?.running]);

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
          setDraftSaveStatus('saved');
        }
      }
      setDraftLoaded(true);
    }).catch(() => setDraftLoaded(true));
  }, [draftRepository]);

  function scheduleDraft(nextActive: Workout, nextNotes: string): void {
    if (isDiscarding.current) return;
    const snapshot = { ...nextActive, notes: nextNotes || undefined };
    if (!draftRepository || !draftLoaded) return;
    const generation = ++draftSaveGeneration.current;
    setDraftSaveStatus('saving');
    setDraftError(undefined);
    draftSaveQueue.current = draftSaveQueue.current
      .then(() => draftRepository.saveDraft(snapshot))
      .then(() => {
        if (draftSaveGeneration.current !== generation) return;
        setDraftError(undefined);
        setDraftSaveStatus('saved');
      })
      .catch(() => {
        if (draftSaveGeneration.current !== generation) return;
        setDraftError('Не удалось сохранить черновик');
        setDraftSaveStatus('error');
      });
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

  function updateSet(exerciseIndex: number, setIndex: number, key: SetMetric, value: string) {
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

  function runRestTimer(exercise?: Exercise): void {
    if (!exercise || !isValidRestSeconds(exercise.restSeconds)) return;
    setRestTimer({
      exerciseId: exercise.id,
      duration: exercise.restSeconds,
      remaining: exercise.restSeconds,
      running: true,
      endsAt: Date.now() + exercise.restSeconds * 1000
    });
  }

  function toggleSetCompletion(exerciseIndex: number, setIndex: number, exercise?: Exercise): void {
    if (!active) return;
    const currentSet = active.exercises[exerciseIndex]?.sets[setIndex];
    if (!currentSet) return;
    const completed = !Boolean(currentSet.completed);
    const nextActive: Workout = {
      ...active,
      exercises: active.exercises.map((item, currentExerciseIndex) => currentExerciseIndex !== exerciseIndex ? item : {
        ...item,
        sets: item.sets.map((set, currentSetIndex) => {
          if (currentSetIndex !== setIndex) return set;
          if (completed) return { ...set, completed: true };
          const nextSet = { ...set };
          delete nextSet.completed;
          return nextSet;
        })
      })
    };
    updateActive(nextActive);
    if (completed) runRestTimer(exercise);
  }

  function startRestTimer(): void {
    if (!restTimer || !isValidRestSeconds(restTimer.duration)) return;
    const remaining = restTimer.remaining > 0 ? restTimer.remaining : restTimer.duration;
    setRestTimer({
      exerciseId: restTimer.exerciseId,
      duration: restTimer.duration,
      remaining,
      running: true,
      endsAt: Date.now() + remaining * 1000
    });
  }

  function pauseRestTimer(): void {
    setRestTimer((current) => {
      if (!current?.running || typeof current.endsAt !== 'number') return current;
      return { ...current, remaining: Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000)), running: false, endsAt: undefined };
    });
  }

  function resetRestTimer(): void {
    setRestTimer((current) => current ? { ...current, remaining: current.duration, running: false, endsAt: undefined } : current);
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
    setRestTimer(undefined);
    setDraftSaveStatus('idle');
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
  const restTimerExercise = restTimer ? exercises.find((exercise) => exercise.id === restTimer.exerciseId) : undefined;

  return (
    <section className="content-page workout-page" aria-labelledby="active-workout-title">
      <header className="page-header active-workout-header"><div><p className="eyebrow"><span className="live-dot" /> В процессе</p><h1 id="active-workout-title">Тренировка: {activeTemplate?.name ?? 'Свободная'}</h1><p className="muted">Все изменения автоматически сохраняются в черновик</p></div><div className="workout-header-actions"><button className="ghost-button danger-button" type="button" onClick={() => void discardDraft()}>Отменить черновик</button></div></header>
      <div className="workout-overview" aria-label="Состав тренировки"><span><strong>{active.exercises.length}</strong><small>{pluralize(active.exercises.length, ['упражнение', 'упражнения', 'упражнений'])}</small></span><i /><span><strong>{active.exercises.reduce((sum, item) => sum + item.sets.length, 0)}</strong><small>{pluralize(active.exercises.reduce((sum, item) => sum + item.sets.length, 0), ['подход', 'подхода', 'подходов'])}</small></span>{draftRepository && draftSaveStatus !== 'idle' && draftSaveStatus !== 'error' && <span className={`autosave-status is-${draftSaveStatus}`} role="status"><b>{draftSaveStatus === 'saving' ? '·' : '✓'}</b>{draftSaveStatus === 'saving' ? 'Сохраняем…' : 'Черновик сохранён'}</span>}</div>
      {draftError && <p className="error-message workout-draft-error" role="alert">{draftError}</p>}
      <form onSubmit={(event) => void save(event)}>
        <div className="workout-exercises">{active.exercises.map((item, exerciseIndex) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
          const name = exercise?.name ?? 'Удалённое упражнение';
          const isExpanded = expandedExerciseId === item.exerciseId;
          const panelId = `workout-exercise-${item.exerciseId}`;
          const metricFields = getMetricFields(exercise);
          const metricClass = `set-grid-${metricFields.length}`;
          return <article className={`workout-card focused-workout-card${isExpanded ? ' is-expanded' : ''}`} key={item.exerciseId}>
            <div className="workout-card-heading"><div><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><span className="workout-card-title"><h2>{name}</h2><small>{item.sets.length} {pluralize(item.sets.length, ['подход', 'подхода', 'подходов'])}{exercise && ` · ${getMuscleGroupLabel(exercise.muscleGroup)}`}{exercise?.restSeconds && ` · отдых ${formatTimer(exercise.restSeconds)}`}</small></span></div><button className="workout-collapse" type="button" aria-label={`${isExpanded ? 'Свернуть' : 'Развернуть'} ${name}`} aria-expanded={isExpanded} aria-controls={panelId} onClick={() => setExpandedExerciseId(isExpanded ? undefined : item.exerciseId)}><span aria-hidden="true">⌄</span></button></div>
            <div className="workout-card-body" id={panelId} hidden={!isExpanded}>
              <div className={`set-header active-set-grid ${metricClass}`}><span>№</span>{metricFields.map((field) => <span key={field.key}>{field.label}</span>)}<span>Готово</span></div>
              {item.sets.map((set, setIndex) => <div className={`set-row active-set-grid ${metricClass}${set.completed ? ' is-complete' : ''}`} key={setIndex}><span className="set-number">{setIndex + 1}</span>{metricFields.map((field) => <input key={field.key} aria-label={getMetricAriaLabel(field.key, setIndex + 1, name)} inputMode={field.inputMode} placeholder={field.placeholder} type="number" min="0" step={field.step} value={set[field.key] ?? ''} onChange={(event) => updateSet(exerciseIndex, setIndex, field.key, event.target.value)} />)}<span className="set-actions"><button className={`set-complete${set.completed ? ' is-complete' : ''}`} type="button" aria-pressed={Boolean(set.completed)} aria-label={`Отметить подход ${setIndex + 1} для ${name} ${set.completed ? 'невыполненным' : 'выполненным'}`} onClick={() => toggleSetCompletion(exerciseIndex, setIndex, exercise)}><span aria-hidden="true">✓</span></button><button className="set-delete" type="button" aria-label={`Удалить подход ${setIndex + 1} для ${name}`} onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: current.sets.filter((_, currentSet) => currentSet !== setIndex) }) })}>×</button></span></div>)}
              <button className="add-set" type="button" onClick={() => updateActive({ ...active, exercises: active.exercises.map((current, index) => index !== exerciseIndex ? current : { ...current, sets: [...current.sets, emptySet()] }) })}>＋ Добавить подход</button>
            </div>
          </article>;
        })}</div>
        {availableExercises.length > 0 && <section className="add-exercise-row exercise-selector" aria-labelledby="exercise-selector-title"><div className="exercise-selector-heading"><div><p className="eyebrow">Следующий шаг</p><h2 id="exercise-selector-title">Добавить упражнение</h2></div><span>{availableExercises.length}</span></div><p>Выберите из своего справочника — новое упражнение сразу появится в тренировке.</p><div className="exercise-choice-grid">{availableExercises.map((exercise) => <button className="chip-button exercise-choice" type="button" key={exercise.id} aria-label={`Добавить ${exercise.name}`} onClick={() => addExercise(exercise.id)}><span className="exercise-choice-icon" aria-hidden="true">＋</span><span><strong>{exercise.name}</strong><small>{getMuscleGroupLabel(exercise.muscleGroup)}</small></span></button>)}</div></section>}
        {availableExercises.length === 0 && active.exercises.length === 0 && <section className="exercise-selector compact-empty-selector" aria-labelledby="exercise-selector-title"><div className="exercise-selector-heading"><div><p className="eyebrow">Нужен справочник</p><h2 id="exercise-selector-title">Нет доступных упражнений</h2></div></div><p>Добавь упражнения в справочник, затем вернись к тренировке.</p></section>}
        <label className="notes-field workout-notes">Заметки тренировки<textarea aria-label="Заметки тренировки" placeholder="Как прошла тренировка?" value={notes} onChange={(event) => { const nextNotes = event.target.value; setNotes(nextNotes); scheduleDraft(active, nextNotes); }} /></label>
        <section className={`workout-rest-timer${restTimer?.running ? ' is-running' : ''}${restTimer?.remaining === 0 ? ' is-finished' : ''}${!restTimer ? ' is-disabled' : ''}`} role="region" aria-label="Таймер отдыха"><div className="rest-timer-copy"><span className="rest-timer-icon" aria-hidden="true">◷</span><span><small>{!restTimer ? 'Таймер не настроен' : restTimer.remaining === 0 ? 'Отдых завершён' : 'Таймер отдыха'}</small><strong>{restTimer ? restTimerExercise?.name ?? 'Упражнение' : 'Задай отдых в упражнении'}</strong></span></div><time aria-live="polite">{restTimer ? formatTimer(restTimer.remaining) : '--:--'}</time>{restTimer && <div className="rest-timer-actions">{restTimer.running ? <button type="button" aria-label="Приостановить таймер отдыха" onClick={pauseRestTimer}>Пауза</button> : <button className="timer-primary" type="button" aria-label="Запустить таймер отдыха" onClick={startRestTimer}>{restTimer.remaining === 0 ? 'Ещё раз' : 'Старт'}</button>}<button type="button" aria-label="Сбросить таймер" onClick={resetRestTimer}>Сброс</button></div>}</section>
        <div className="workout-finish-bar"><span><strong>Готово?</strong><small>Проверь подходы перед сохранением</small></span><button className="primary-submit" type="submit">Завершить и сохранить тренировку</button></div>{saved && <p className="saved-message">Тренировка сохранена</p>}
      </form>
    </section>
  );
}
