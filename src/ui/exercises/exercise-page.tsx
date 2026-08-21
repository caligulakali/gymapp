import { useEffect, useState, type FormEvent } from 'react';
import { createExercise, type ExerciseDraft } from '../../domain/exercise-service';
import { getMuscleGroupLabel, MUSCLE_CATEGORIES } from '../../domain/muscle-groups';
import type { Exercise, ExerciseType, MuscleGroup, WeightUnit } from '../../db/entities';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';

type ExercisePageProps = {
  repository: ExerciseRepositoryPort;
  createId?: () => string;
  onSelectExercise?: (exercise: Exercise) => void;
  onBack?: () => void;
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

const TYPE_OPTIONS: readonly [ExerciseType, string][] = [
  ['strength', 'Силовое'], ['cardio', 'Кардио'], ['time', 'На время'], ['reps', 'На количество']
];

function makeId(): string {
  return crypto.randomUUID();
}

export function ExercisePage({ repository, createId = makeId, onSelectExercise, onBack }: ExercisePageProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isMusclePickerOpen, setIsMusclePickerOpen] = useState(false);

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

  function selectMuscleGroup(value: MuscleGroup) {
    updateForm('muscleGroup', value);
    setIsMusclePickerOpen(false);
  }

  function selectExerciseType(value: ExerciseType) {
    updateForm('type', value);
  }

  function selectWeightUnit(value: WeightUnit) {
    updateForm('unit', value);
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
    if (!window.confirm(`Удалить упражнение «${exercise.name}»? История тренировок сохранится. В существующих шаблонах оно будет отмечено как удалённое.`)) return;
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
    <section className={`exercise-page${onSelectExercise ? ' exercise-picker-page' : ''}`} aria-labelledby="exercise-page-title">
      <div className="page-heading">
        <p className="eyebrow">{onSelectExercise ? 'Выбор упражнения' : 'Справочник'}</p>
        <h2 id="exercise-page-title">Упражнения</h2>
        <p>{onSelectExercise ? 'Выберите упражнение — его можно будет настроить в шаблоне.' : 'Создайте свой список упражнений для быстрых тренировок.'}</p>
        {onBack && <button className="ghost-button back-button" type="button" onClick={onBack}><span aria-hidden="true">←</span> Вернуться к шаблону</button>}
      </div>
      <form className="exercise-form" onSubmit={handleSubmit}>
        <label>Название<input aria-label="Название" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
        <label className="muscle-group-field">Мышечная группа
          <span className="muscle-picker">
            <select className="muscle-group-native-select" aria-label="Мышечная группа" value={form.muscleGroup} onChange={(event) => updateForm('muscleGroup', event.target.value as MuscleGroup)} tabIndex={-1}>{MUSCLE_CATEGORIES.map((category) => <optgroup key={category.value} label={category.label}>{category.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}</select>
            <button className={`muscle-picker-trigger${isMusclePickerOpen ? ' is-open' : ''}`} type="button" aria-label="Выбрать мышечную группу" aria-haspopup="listbox" aria-expanded={isMusclePickerOpen} onClick={() => setIsMusclePickerOpen((current) => !current)}><span className="muscle-picker-icon" aria-hidden="true">◈</span><span><strong>{getMuscleGroupLabel(form.muscleGroup)}</strong><small>Выберите зону нагрузки</small></span><span className="muscle-picker-chevron" aria-hidden="true">⌄</span></button>
            {isMusclePickerOpen && <div className="muscle-picker-menu" role="listbox" aria-label="Группы мышц">{MUSCLE_CATEGORIES.map((category) => <div className="muscle-picker-category" key={category.value} role="group" aria-label={category.label}><div className="muscle-picker-category-heading"><span>{category.label}</span><small>{category.options.length} зоны</small></div><div className="muscle-picker-options">{category.options.map((option) => <button className={option.value === form.muscleGroup ? 'muscle-picker-option is-selected' : 'muscle-picker-option'} type="button" role="option" aria-selected={option.value === form.muscleGroup} key={option.value} onClick={() => selectMuscleGroup(option.value)}><span>{option.label}</span>{option.value === form.muscleGroup && <span aria-hidden="true">✓</span>}</button>)}</div></div>)}</div>}
          </span>
        </label>
        <label className="type-field">Тип
          <select className="exercise-control-native-select" aria-label="Тип" value={form.type} onChange={(event) => updateForm('type', event.target.value as ExerciseType)} tabIndex={-1}>{TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <span className="type-picker" role="radiogroup" aria-label="Тип упражнения"><button className="type-picker-trigger" type="button" aria-label="Выбрать тип упражнения"><span className="control-icon" aria-hidden="true">◌</span><span><strong>{TYPE_OPTIONS.find(([value]) => value === form.type)?.[1]}</strong><small>Как фиксировать результат</small></span></button><span className="type-picker-options">{TYPE_OPTIONS.map(([value, label]) => <button className={value === form.type ? 'type-picker-option is-selected' : 'type-picker-option'} type="button" role="radio" aria-checked={value === form.type} aria-label={label} key={value} onClick={() => selectExerciseType(value)}><span className="type-option-dot" aria-hidden="true">{value === form.type ? '✓' : ''}</span><span>{label}</span></button>)}</span></span>
        </label>
        <label className="unit-field">Единица веса
          <select className="exercise-control-native-select" aria-label="Единица веса" value={form.unit} onChange={(event) => updateForm('unit', event.target.value as WeightUnit)} tabIndex={-1}><option value="kg">Килограммы (кг)</option></select>
          <span className="unit-picker" role="radiogroup" aria-label="Единицы веса"><button className="unit-option is-selected" type="button" role="radio" aria-checked="true" aria-label="Выбрать килограммы" onClick={() => selectWeightUnit('kg')}><strong>KG</strong><span>Килограммы (кг)</span></button></span>
        </label>
        <label className="notes-field exercise-notes-field"><span className="notes-heading"><span><strong>Заметки</strong><small>Подсказки по технике или ощущениям</small></span><span>{form.notes?.length ?? 0}/240</span></span><textarea aria-label="Заметки" maxLength={240} value={form.notes ?? ''} onChange={(event) => updateForm('notes', event.target.value)} /></label>
        <label className={`favourite-toggle${form.favourite ? ' is-selected' : ''}`}><input className="favourite-input" type="checkbox" aria-label="Избранное" checked={form.favourite} onChange={(event) => updateForm('favourite', event.target.checked)} /><span className="favourite-star" aria-hidden="true">★</span><span><strong>Избранное</strong><small>Показывать выше в списках выбора</small></span><span className="favourite-check" aria-hidden="true">{form.favourite ? '✓' : ''}</span></label>
        {error && <p role="alert">{error}</p>}
        <button className="primary-submit save-exercise-button" type="submit"><span aria-hidden="true">✓</span> {editingId ? 'Сохранить изменения' : 'Сохранить упражнение'}</button>
      </form>
      <ul className={`exercise-list${onSelectExercise ? ' exercise-choice-list' : ''}`} aria-label="Список упражнений">
        {exercises.map((exercise) => <li key={exercise.id}>
          <div className="exercise-list-content"><strong>{exercise.favourite ? '★ ' : ''}{exercise.name}</strong><small className="exercise-muscle">{getMuscleGroupLabel(exercise.muscleGroup)}</small>{exercise.notes && <small>{exercise.notes}</small>}</div>
          <div className="item-actions">{onSelectExercise && <button className="secondary-button choose-exercise-button" type="button" aria-label={`Выбрать ${exercise.name}`} onClick={() => onSelectExercise(exercise)}><span aria-hidden="true">＋</span> Выбрать</button>}<button className="ghost-button" type="button" aria-label={`Редактировать ${exercise.name}`} onClick={() => startEditing(exercise)}>Изменить</button><button className="ghost-button danger-button" type="button" aria-label={`Удалить ${exercise.name}`} onClick={() => void handleDelete(exercise)}>Удалить</button></div>
        </li>)}
      </ul>
    </section>
  );
}
