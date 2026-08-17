import { useEffect, useState, type FormEvent } from 'react';
import { createExercise, type ExerciseDraft } from '../../domain/exercise-service';
import type { Exercise, ExerciseType, MuscleGroup, WeightUnit } from '../../db/entities';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';

type ExercisePageProps = {
  repository: ExerciseRepositoryPort;
  createId?: () => string;
};

type FormState = ExerciseDraft & { favourite: boolean };

const EMPTY_FORM: FormState = {
  name: '',
  muscleGroup: 'chest',
  type: 'strength',
  unit: 'kg',
  notes: '',
  favourite: false
};

const MUSCLE_GROUP_OPTIONS: readonly [MuscleGroup, string][] = [
  ['chest', 'Грудь'], ['back', 'Спина'], ['legs', 'Ноги'], ['shoulders', 'Плечи'],
  ['arms', 'Руки'], ['abs', 'Пресс'], ['cardio', 'Кардио']
];
const TYPE_OPTIONS: readonly [ExerciseType, string][] = [
  ['strength', 'Силовое'], ['cardio', 'Кардио'], ['time', 'На время'], ['reps', 'На количество']
];

function makeId(): string {
  return crypto.randomUUID();
}

export function ExercisePage({ repository, createId = makeId }: ExercisePageProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    repository.getAll().then((loadedExercises) => {
      if (active) setExercises(loadedExercises);
    }).catch(() => {
      if (active) setError('Не удалось загрузить упражнения');
    });
    return () => { active = false; };
  }, [repository]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      const entity = createExercise(form, editingId ?? createId());
      const savedEntity = { ...entity, favourite: form.favourite };
      await repository.save(savedEntity);
      setExercises((current) => editingId
        ? current.map((item) => item.id === editingId ? savedEntity : item)
        : [...current, savedEntity]);
      setForm(EMPTY_FORM);
      setEditingId(undefined);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Проверьте данные упражнения');
    }
  }

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      type: exercise.type,
      unit: exercise.unit,
      notes: exercise.notes ?? '',
      favourite: exercise.favourite
    });
  }

  async function handleDelete(exercise: Exercise) {
    if (!window.confirm(`Удалить упражнение «${exercise.name}»? История тренировок сохранится, но упражнение будет убрано из шаблонов.`)) return;
    try {
      await repository.remove(exercise.id);
      setExercises((current) => current.filter((item) => item.id !== exercise.id));
      if (editingId === exercise.id) {
        setForm(EMPTY_FORM);
        setEditingId(undefined);
      }
    } catch {
      setError('Не удалось удалить упражнение');
    }
  }

  return (
    <section className="exercise-page" aria-labelledby="exercise-page-title">
      <div className="page-heading">
        <p className="eyebrow">Справочник</p>
        <h2 id="exercise-page-title">Упражнения</h2>
        <p>Создайте свой список упражнений для быстрых тренировок.</p>
      </div>
      <form className="exercise-form" onSubmit={handleSubmit}>
        <label>Название<input aria-label="Название" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
        <label>Мышечная группа<select aria-label="Мышечная группа" value={form.muscleGroup} onChange={(event) => updateForm('muscleGroup', event.target.value as MuscleGroup)}>{MUSCLE_GROUP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Тип<select aria-label="Тип" value={form.type} onChange={(event) => updateForm('type', event.target.value as ExerciseType)}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Единица веса<select aria-label="Единица веса" value={form.unit} onChange={(event) => updateForm('unit', event.target.value as WeightUnit)}><option value="kg">Килограммы (кг)</option><option value="lb">Фунты (lb)</option></select></label>
        <label>Заметки<textarea aria-label="Заметки" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} /></label>
        <label className="checkbox-label"><input type="checkbox" aria-label="Избранное" checked={form.favourite} onChange={(event) => updateForm('favourite', event.target.checked)} /> Избранное</label>
        {error && <p role="alert">{error}</p>}
        <button type="submit">{editingId ? 'Сохранить изменения' : 'Сохранить упражнение'}</button>
      </form>
      <ul className="exercise-list" aria-label="Список упражнений">
        {exercises.map((exercise) => <li key={exercise.id}>
          <div><strong>{exercise.favourite ? '★ ' : ''}{exercise.name}</strong>{exercise.notes && <small>{exercise.notes}</small>}</div>
          <div className="item-actions"><button type="button" aria-label={`Редактировать ${exercise.name}`} onClick={() => startEditing(exercise)}>Изменить</button><button type="button" aria-label={`Удалить ${exercise.name}`} onClick={() => void handleDelete(exercise)}>Удалить</button></div>
        </li>)}
      </ul>
    </section>
  );
}
