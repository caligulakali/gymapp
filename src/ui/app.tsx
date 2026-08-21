import { useEffect, useState } from 'react';
import { exerciseRepository } from '../db/exercise-repository';
import { templateRepository } from '../db/template-repository';
import { workoutRepository } from '../db/workout-repository';
import { workoutDraftRepository } from '../db/workout-draft-repository';
import { dataTransferRepository } from '../db/data-transfer-repository';
import type { ExerciseRepositoryPort } from '../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../domain/template-repository-port';
import type { WorkoutRepositoryPort } from '../domain/workout-repository-port';
import { DashboardPage } from './dashboard-page';
import { HistoryPage } from './history-page';
import { ExercisePage } from './exercises/exercise-page';
import { TemplatePage } from './templates/template-page';
import { WorkoutPage } from './workouts/workout-page';
import { DataTransferPage } from './data-transfer-page';

import type { DataTransferRepositoryPort } from '../domain/data-transfer-repository-port';

type Section = 'home' | 'history' | 'exercises' | 'templates' | 'data-transfer' | 'workout';
type AppProps = { exerciseRepository?: ExerciseRepositoryPort; templateRepository?: TemplateRepositoryPort; workoutRepository?: WorkoutRepositoryPort; dataTransferRepository?: DataTransferRepositoryPort };
const navItems: { id: Section; label: string; icon: string }[] = [{ id: 'home', label: 'Обзор', icon: '⌂' }, { id: 'history', label: 'История', icon: '▤' }, { id: 'exercises', label: 'Упражнения', icon: '⊙' }, { id: 'templates', label: 'Шаблоны', icon: '▦' }, { id: 'data-transfer', label: 'Данные', icon: '⇅' }];

export function App({ exerciseRepository: exercises = exerciseRepository, templateRepository: templates = templateRepository, workoutRepository: workouts = workoutRepository, dataTransferRepository: data = dataTransferRepository }: AppProps) {
  const [section, setSection] = useState<Section>('home');
  const [workoutList, setWorkoutList] = useState<Awaited<ReturnType<WorkoutRepositoryPort['getAll']>>>([]);
  const [exerciseList, setExerciseList] = useState<Awaited<ReturnType<ExerciseRepositoryPort['getAll']>>>([]);
  const [templateList, setTemplateList] = useState<Awaited<ReturnType<TemplateRepositoryPort['getAll']>>>([]);
  useEffect(() => { void workouts.getAll().then(setWorkoutList).catch(() => setWorkoutList([])); }, [workouts]);
  useEffect(() => { void Promise.all([exercises.getAll(), templates.getAll()]).then(([nextExercises, nextTemplates]) => { setExerciseList(nextExercises); setTemplateList(nextTemplates); }).catch(() => { setExerciseList([]); setTemplateList([]); }); }, [exercises, templates]);
  const navigate = (next: Section) => setSection(next);
  const reloadAll = () => { void Promise.all([workouts.getAll(), exercises.getAll(), templates.getAll()]).then(([nextWorkouts, nextExercises, nextTemplates]) => { setWorkoutList(nextWorkouts); setExerciseList(nextExercises); setTemplateList(nextTemplates); }); };
  const page = section === 'home' ? <DashboardPage workouts={workoutList} onStartWorkout={() => navigate('workout')} onNavigate={navigate} /> : section === 'history' ? <HistoryPage workouts={workoutList} repository={workouts} templates={templateList} exercises={exerciseList} onChanged={reloadAll} /> : section === 'exercises' ? <ExercisePage repository={exercises} onChanged={reloadAll} /> : section === 'templates' ? <TemplatePage templateRepository={templates} exerciseRepository={exercises} onChanged={reloadAll} /> : section === 'data-transfer' ? <DataTransferPage repository={data} onChanged={reloadAll} /> : <WorkoutPage workoutRepository={workouts} templateRepository={templates} exerciseRepository={exercises} draftRepository={workoutDraftRepository} createId={() => crypto.randomUUID()} now={() => new Date().toISOString()} onSaved={() => { reloadAll(); navigate('history'); }} />;
  const renderNav = (mobile = false) => <nav aria-label={mobile ? 'Мобильная навигация' : 'Основная навигация'}>{navItems.map((item) => <button aria-label={item.label} className={section === item.id ? 'nav-item active' : 'nav-item'} key={item.id} type="button" onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>;
  return <main className="app-shell"><h1 className="sr-only">GymApp</h1><aside className="sidebar"><div className="brand"><span className="brand-mark">G</span><span>GYM<span>APP</span></span></div><p className="sidebar-label">МЕНЮ</p>{renderNav()}<div className="sidebar-bottom"><div className="privacy-note"><span>◈</span><div><strong>Локально и приватно</strong><small>Данные только на этом устройстве</small></div></div></div></aside><div className="app-main"><header className="mobile-header"><div className="brand"><span className="brand-mark">G</span><span>GYM<span>APP</span></span></div></header>{page}</div><div className="mobile-nav">{renderNav(true)}</div></main>;
}
