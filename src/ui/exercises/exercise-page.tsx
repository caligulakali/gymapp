import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createExercise, EQUIPMENT_OPTIONS, getEquipmentLabel, type ExerciseDraft } from '../../domain/exercise-service';
import { getMuscleGroupLabel, MUSCLE_CATEGORIES } from '../../domain/muscle-groups';
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from '../../db/entities';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';

type ExercisePageProps = {
  repository: ExerciseRepositoryPort;
  createId?: () => string;
  onSelectExercise?: (exercise: Exercise) => void;
  onBack?: () => void;
  onChanged?: () => void;
};

type FormState = ExerciseDraft & { favourite: boolean };
type CatalogueFilter = 'all' | 'favourites';

const EMPTY_FORM: FormState = { name: '', equipment: 'dumbbells', muscleGroup: 'chest', type: 'strength', unit: 'kg', notes: '', favourite: false };
const TYPE_OPTIONS: readonly { value: ExerciseType; label: string; hint: string }[] = [
  { value: 'strength', label: 'Силовое', hint: 'Вес и повторы' },
  { value: 'cardio', label: 'Кардио', hint: 'Время и расстояние' },
  { value: 'time', label: 'На время', hint: 'Продолжительность' },
  { value: 'reps', label: 'На количество', hint: 'Повторы' }
];

function makeId(): string {
  return crypto.randomUUID();
}

function getExerciseInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('ru-RU') || '•';
}

export function ExercisePage({ repository, createId = makeId, onSelectExercise, onBack, onChanged }: ExercisePageProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [isMusclePickerOpen, setIsMusclePickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogueFilter>('all');

  useEffect(() => {
    let active = true;
    repository.getAll().then((loadedExercises) => {
      if (active) setExercises(loadedExercises);
    }).catch(() => {
      if (active) setError('Не удалось загрузить упражнения');
    });
    return () => { active = false; };
  }, [repository]);

  const visibleExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
    return exercises
      .filter((exercise) => filter === 'all' || exercise.favourite)
      .filter((exercise) => !normalizedQuery || `${exercise.name} ${getEquipmentLabel(exercise.equipment)} ${getMuscleGroupLabel(exercise.muscleGroup)}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery))
      .sort((left, right) => Number(Boolean(right.favourite)) - Number(Boolean(left.favourite)) || left.name.localeCompare(right.name, 'ru-RU'));
  }, [exercises, filter, query]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNewExercise(): void {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setError(undefined);
    setIsEditing(true);
  }

  function closeEditor(): void {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setError(undefined);
    setIsMusclePickerOpen(false);
    setIsEditing(false);
  }

  function startEditing(exercise: Exercise): void {
    setEditingId(exercise.id);
    setForm({ name: exercise.name, equipment: exercise.equipment ?? 'other', muscleGroup: exercise.muscleGroup, type: exercise.type, unit: exercise.unit, notes: exercise.notes ?? '', favourite: exercise.favourite });
    setError(undefined);
    setIsEditing(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    try {
      const entity = createExercise(form, editingId ?? createId());
      const savedEntity = { ...entity, favourite: form.favourite };
      await repository.save(savedEntity);
      onChanged?.();
      setExercises((current) => editingId ? current.map((item) => item.id === editingId ? savedEntity : item) : [...current, savedEntity]);
      closeEditor();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Проверьте данные упражнения');
    }
  }

  async function handleDelete(exercise: Exercise): Promise<void> {
    if (!window.confirm(`Удалить упражнение «${exercise.name}»? История тренировок сохранится. В существующих шаблонах оно будет отмечено как удалённое.`)) return;
    try {
      await repository.remove(exercise.id);
      onChanged?.();
      setExercises((current) => current.filter((item) => item.id !== exercise.id));
      if (editingId === exercise.id) closeEditor();
    } catch {
      setError('Не удалось удалить упражнение');
    }
  }

  if (isEditing) {
    return <section className="exercise-page exercise-editor" aria-labelledby="exercise-editor-title">
      <header className="editor-header"><button className="editor-back" type="button" aria-label="Назад к упражнениям" onClick={closeEditor}>←</button><div><p className="eyebrow">{editingId ? 'Редактирование' : 'Новое упражнение'}</p><h2 id="exercise-editor-title">{editingId ? 'Изменить упражнение' : 'Новое упражнение'}</h2></div></header>
      <form className="exercise-form streamlined-form simple-exercise-form" onSubmit={handleSubmit}>
        <label className="prominent-field"><span>1 · Название</span><input aria-label="Название" autoFocus placeholder="Например, жим гантелей" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
        <fieldset className="simple-choice-field"><legend>2 · Снаряд</legend><div className="equipment-grid" role="radiogroup" aria-label="Снаряд">{EQUIPMENT_OPTIONS.map((option) => <button className={option.value === form.equipment ? 'equipment-option is-selected' : 'equipment-option'} type="button" role="radio" aria-checked={option.value === form.equipment} aria-label={option.label} key={option.value} onClick={() => updateForm('equipment', option.value as Equipment)}><span aria-hidden="true" />{option.label}</button>)}</div></fieldset>
        <section className="simple-choice-field muscle-choice" aria-labelledby="muscle-section-title"><h3 id="muscle-section-title">3 · Группа мышц</h3><label className="muscle-group-field"><span className="muscle-picker"><select className="muscle-group-native-select" aria-label="Мышечная группа" value={form.muscleGroup} onChange={(event) => updateForm('muscleGroup', event.target.value as MuscleGroup)} tabIndex={-1}>{MUSCLE_CATEGORIES.map((category) => <optgroup key={category.value} label={category.label}>{category.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}</select><button className={`muscle-picker-trigger${isMusclePickerOpen ? ' is-open' : ''}`} type="button" aria-label="Выбрать мышечную группу" aria-haspopup="listbox" aria-expanded={isMusclePickerOpen} onClick={() => setIsMusclePickerOpen((current) => !current)}><span><strong>{getMuscleGroupLabel(form.muscleGroup)}</strong><small>Нажми, чтобы изменить</small></span><span className="muscle-picker-chevron" aria-hidden="true">⌄</span></button>{isMusclePickerOpen && <div className="muscle-picker-menu" role="listbox" aria-label="Группы мышц">{MUSCLE_CATEGORIES.map((category) => <div className="muscle-picker-category" key={category.value} role="group" aria-label={category.label}><div className="muscle-picker-category-heading"><span>{category.label}</span></div><div className="muscle-picker-options">{category.options.map((option) => <button className={option.value === form.muscleGroup ? 'muscle-picker-option is-selected' : 'muscle-picker-option'} type="button" role="option" aria-selected={option.value === form.muscleGroup} key={option.value} onClick={() => { updateForm('muscleGroup', option.value); setIsMusclePickerOpen(false); }}><span>{option.label}</span>{option.value === form.muscleGroup && <span aria-hidden="true">✓</span>}</button>)}</div></div>)}</div>}</span></label></section>
        <fieldset className="simple-choice-field exercise-type-field"><legend>4 · Как считать результат</legend><div className="type-picker-options" role="radiogroup" aria-label="Тип упражнения">{TYPE_OPTIONS.map((option) => <button className={option.value === form.type ? 'type-picker-option is-selected' : 'type-picker-option'} type="button" role="radio" aria-checked={option.value === form.type} aria-label={option.label} key={option.value} onClick={() => updateForm('type', option.value)}><span className="type-option-dot" aria-hidden="true">{option.value === form.type ? '✓' : ''}</span><span><strong>{option.label}</strong><small>{option.hint}</small></span></button>)}</div></fieldset>
        <section className="simple-choice-field exercise-details" aria-labelledby="exercise-details-title"><h3 id="exercise-details-title">5 · Детали</h3><label className="notes-field exercise-notes-field"><span>Заметки</span><textarea aria-label="Заметки" maxLength={240} placeholder="Техника, темп или настройки тренажёра" value={form.notes ?? ''} onChange={(event) => updateForm('notes', event.target.value)} /></label><label className={`favourite-toggle${form.favourite ? ' is-selected' : ''}`}><input className="favourite-input" type="checkbox" aria-label="Избранное" checked={form.favourite} onChange={(event) => updateForm('favourite', event.target.checked)} /><span className="favourite-star" aria-hidden="true">★</span><span><strong>Добавить в избранное</strong><small>Будет выше в списках</small></span><span className="favourite-check" aria-hidden="true">{form.favourite ? '✓' : ''}</span></label></section>
        {error && <p role="alert">{error}</p>}
        <div className="editor-actions"><button className="ghost-button" type="button" onClick={closeEditor}>Отмена</button><button className="primary-submit save-exercise-button" type="submit">{editingId ? 'Сохранить изменения' : 'Сохранить упражнение'} <span aria-hidden="true">→</span></button></div>
      </form>
    </section>;
  }

  return <section className={`exercise-page catalogue-page${onSelectExercise ? ' exercise-picker-page' : ''}`} aria-labelledby="exercise-page-title">
    <header className="catalogue-header"><div><p className="eyebrow">{onSelectExercise ? 'Выбор упражнения' : 'Справочник'}</p><h2 id="exercise-page-title">Упражнения</h2><p>{onSelectExercise ? 'Выбери движение — настройки шаблона появятся следующим шагом.' : 'Твой каталог движений для быстрых тренировок.'}</p></div><div className="catalogue-header-actions">{onBack && <button className="ghost-button" type="button" aria-label="Вернуться к шаблону" onClick={onBack}>← К шаблону</button>}<button className="catalogue-add" type="button" aria-label="Новое упражнение" onClick={openNewExercise}><span aria-hidden="true">＋</span><span>Новое упражнение</span></button></div></header>
    <div className="catalogue-tools"><label className="catalogue-search"><span aria-hidden="true">⌕</span><input type="search" role="searchbox" aria-label="Поиск упражнений" placeholder="Найти упражнение" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-chips" aria-label="Фильтр упражнений"><button className={filter === 'all' ? 'is-active' : ''} type="button" onClick={() => setFilter('all')}>Все <span>{exercises.length}</span></button><button className={filter === 'favourites' ? 'is-active' : ''} type="button" onClick={() => setFilter('favourites')}>★ Избранное</button></div></div>
    {error && <p className="catalogue-error" role="alert">{error}</p>}
    <ul className={`exercise-list modern-list${onSelectExercise ? ' exercise-choice-list' : ''}`} aria-label="Список упражнений">{visibleExercises.map((exercise) => <li className="modern-card" key={exercise.id}><span className="exercise-avatar" aria-hidden="true">{getExerciseInitial(exercise.name)}</span><div className="exercise-list-content"><strong>{exercise.name}{exercise.favourite && <span className="card-favourite">★</span>}</strong><span className="card-meta"><small>{getMuscleGroupLabel(exercise.muscleGroup)}</small><i /> <small>{getEquipmentLabel(exercise.equipment)}</small></span>{exercise.notes && <small className="card-note">{exercise.notes}</small>}</div><div className="item-actions">{onSelectExercise && <button className="card-primary-action" type="button" aria-label={`Выбрать ${exercise.name}`} onClick={() => onSelectExercise(exercise)}>Добавить</button>}<button className="card-icon-action" type="button" aria-label={`Редактировать ${exercise.name}`} onClick={() => startEditing(exercise)}>✎</button><button className="card-icon-action danger-button" type="button" aria-label={`Удалить ${exercise.name}`} onClick={() => void handleDelete(exercise)}>×</button></div></li>)}</ul>
    {visibleExercises.length === 0 && <div className="empty-state catalogue-empty"><span aria-hidden="true">{query || filter === 'favourites' ? '⌕' : '＋'}</span><strong>{query || filter === 'favourites' ? 'Ничего не найдено' : 'Каталог пока пуст'}</strong><p>{query || filter === 'favourites' ? 'Попробуй изменить поиск или фильтр.' : 'Добавь первое упражнение — это займёт меньше минуты.'}</p>{!query && filter === 'all' && <button className="empty-action" type="button" onClick={openNewExercise}>Создать упражнение</button>}</div>}
  </section>;
}
