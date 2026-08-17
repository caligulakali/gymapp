import { useEffect, useState, type FormEvent } from 'react';
import { createTemplate, type TemplateDraft } from '../../domain/template-service';
import type { Exercise, Template, TemplateExercise } from '../../db/entities';
import type { ExerciseRepositoryPort } from '../../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../../domain/template-repository-port';

type TemplatePageProps = {
  templateRepository: TemplateRepositoryPort;
  exerciseRepository: Pick<ExerciseRepositoryPort, 'getAll'>;
  createId?: () => string;
};

type FormState = Omit<TemplateDraft, 'exercises'> & { exercises: TemplateExercise[] };

const EMPTY_FORM: FormState = { name: '', notes: '', exercises: [] };

function makeId(): string {
  return crypto.randomUUID();
}

export function TemplatePage({ templateRepository, exerciseRepository, createId = makeId }: TemplatePageProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [sets, setSets] = useState('');
  const [targetReps, setTargetReps] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    Promise.all([templateRepository.getAll(), exerciseRepository.getAll()]).then(([loadedTemplates, loadedExercises]) => {
      if (!active) return;
      setTemplates(loadedTemplates);
      setExercises(loadedExercises);
      setSelectedExerciseId(loadedExercises[0]?.id ?? '');
    }).catch(() => {
      if (active) setError('Не удалось загрузить шаблоны и упражнения');
    });
    return () => { active = false; };
  }, [templateRepository, exerciseRepository]);

  function addExercise() {
    if (!selectedExerciseId) return;
    setForm((current) => ({
      ...current,
      exercises: [...current.exercises, {
        exerciseId: selectedExerciseId,
        order: current.exercises.length,
        sets: Number(sets),
        ...(targetReps ? { targetReps: Number(targetReps) } : {}),
        ...(targetWeight ? { targetWeight: Number(targetWeight) } : {})
      }]
    }));
    setSets('');
    setTargetReps('');
    setTargetWeight('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      const entity = createTemplate(form, editingId ?? createId());
      await templateRepository.save(entity);
      setTemplates((current) => editingId
        ? current.map((item) => item.id === editingId ? entity : item)
        : [...current, entity]);
      setForm(EMPTY_FORM);
      setEditingId(undefined);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Проверьте данные шаблона');
    }
  }

  function startEditing(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.name, notes: template.notes ?? '', exercises: template.exercises });
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Удалить шаблон «${template.name}»? История тренировок сохранится.`)) return;
    try {
      await templateRepository.remove(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingId === template.id) {
        setForm(EMPTY_FORM);
        setEditingId(undefined);
      }
    } catch {
      setError('Не удалось удалить шаблон');
    }
  }

  async function duplicateTemplate(template: Template) {
    const copy: Template = {
      ...template,
      id: createId(),
      name: `${template.name} — копия`,
      exercises: template.exercises.map((exercise) => ({ ...exercise }))
    };
    try {
      await templateRepository.save(copy);
      setTemplates((current) => [...current, copy]);
    } catch {
      setError('Не удалось дублировать шаблон');
    }
  }

  return (
    <section className="template-page" aria-labelledby="template-page-title">
      <div className="page-heading">
        <p className="eyebrow">Тренировки</p>
        <h2 id="template-page-title">Шаблоны</h2>
        <p>Соберите привычную последовательность упражнений один раз.</p>
      </div>
      <form className="template-form" onSubmit={handleSubmit}>
        <label>Название шаблона<input aria-label="Название шаблона" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Заметки шаблона<textarea aria-label="Заметки шаблона" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <label>Упражнение<select aria-label="Упражнение" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label>
        <label>Количество подходов<input aria-label="Количество подходов" type="number" min="1" value={sets} onChange={(event) => setSets(event.target.value)} /></label>
        <label>Целевые повторения<input aria-label="Целевые повторения" type="number" min="1" value={targetReps} onChange={(event) => setTargetReps(event.target.value)} /></label>
        <label>Целевой вес<input aria-label="Целевой вес" type="number" min="0" step="0.5" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} /></label>
        <button type="button" onClick={addExercise}>Добавить упражнение</button>
        <ul className="template-exercise-list" aria-label="Упражнения шаблона">{form.exercises.map((item) => <li key={`${item.exerciseId}-${item.order}`}>{exercises.find((exercise) => exercise.id === item.exerciseId)?.name ?? item.exerciseId} — {item.sets} подхода</li>)}</ul>
        {error && <p role="alert">{error}</p>}
        <button type="submit">{editingId ? 'Сохранить изменения шаблона' : 'Сохранить шаблон'}</button>
      </form>
      <ul className="template-list" aria-label="Список шаблонов">{templates.map((template) => <li key={template.id}><div><strong>{template.name}</strong><small>{template.exercises.length} упр.</small></div><div className="item-actions"><button type="button" aria-label={`Редактировать шаблон ${template.name}`} onClick={() => startEditing(template)}>Изменить</button><button type="button" aria-label={`Дублировать шаблон ${template.name}`} onClick={() => void duplicateTemplate(template)}>Дублировать</button><button type="button" aria-label={`Удалить шаблон ${template.name}`} onClick={() => void handleDelete(template)}>Удалить</button></div></li>)}</ul>
    </section>
  );
}
