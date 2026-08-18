import { useEffect, useState } from 'react';
import { exerciseRepository } from '../db/exercise-repository';
import { templateRepository } from '../db/template-repository';
import { workoutRepository } from '../db/workout-repository';
import { dataTransferRepository } from '../db/data-transfer-repository';
import type { ExerciseRepositoryPort } from '../domain/exercise-repository-port';
import type { TemplateRepositoryPort } from '../domain/template-repository-port';
import type { WorkoutRepositoryPort } from '../domain/workout-repository-port';
import { DashboardPage } from './dashboard-page';
import { HistoryPage } from './history-page';
import { ProgressPage } from './progress-page';
import { ExercisePage } from './exercises/exercise-page';
import { TemplatePage } from './templates/template-page';
import { WorkoutPage } from './workouts/workout-page';
import { DataTransferPage } from './data-transfer-page';

import type { DataTransferRepositoryPort } from '../domain/data-transfer-repository-port';

type Section = 'home' | 'history' | 'progress' | 'exercises' | 'templates' | 'data-transfer' | 'workout';
type AppProps = { exerciseRepository?: ExerciseRepositoryPort; templateRepository?: TemplateRepositoryPort; workoutRepository?: WorkoutRepositoryPort; dataTransferRepository?: DataTransferRepositoryPort };
const navItems: { id: Section; label: string; icon: string }[] = [{ id: 'home', label: 'Обзор', icon: '⌂' }, { id: 'history', label: 'История', icon: '▤' }, { id: 'progress', label: 'Прогресс', icon: '↗' }, { id: 'exercises', label: 'Упражнения', icon: '⊙' }, { id: 'templates', label: 'Шаблоны', icon: '▦' }, { id: 'data-transfer', label: 'Данные', icon: '⇅' }];

export function App({ exerciseRepository: exercises = exerciseRepository, templateRepository: templates = templateRepository, workoutRepository: workouts = workoutRepository, dataTransferRepository: data = dataTransferRepository }: AppProps) {
  const [section, setSection] = useState<Section>('home');
  const [workoutList, setWorkoutList] = useState<Awaited<ReturnType<WorkoutRepositoryPort['getAll']>>>([]);
  useEffect(() => { void workouts.getAll().then(setWorkoutList).catch(() => setWorkoutList([])); }, [workouts]);
  const navigate = (next: Section) => setSection(next);
  const page = section === 'home' ? <DashboardPage workouts={workoutList} onStartWorkout={() => navigate('workout')} onNavigate={navigate} /> : section === 'history' ? <HistoryPage workouts={workoutList} repository={workouts} onChanged={() => { void workouts.getAll().then(setWorkoutList); }} /> : section === 'progress' ? <ProgressPage workouts={workoutList} /> : section === 'exercises' ? <ExercisePage repository={exercises} /> : section === 'templates' ? <TemplatePage templateRepository={templates} exerciseRepository={exercises} /> : section === 'data-transfer' ? <DataTransferPage repository={data} /> : <WorkoutPage workoutRepository={workouts} templateRepository={templates} exerciseRepository={exercises} createId={() => crypto.randomUUID()} now={() => new Date().toISOString()} onSaved={() => { void workouts.getAll().then(setWorkoutList); navigate('history'); }} />;
  const renderNav = (mobile = false) => <nav aria-label={mobile ? 'Мобильная навигация' : 'Основная навигация'}>{navItems.map((item) => <button aria-label={item.label} className={section === item.id ? 'nav-item active' : 'nav-item'} key={item.id} type="button" onClick={() => navigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>;
  return <main className="app-shell"><h1 className="sr-only">GymApp</h1><aside className="sidebar"><div className="brand"><span className="brand-mark">G</span><span>GYM<span>APP</span></span></div><p className="sidebar-label">МЕНЮ</p>{renderNav()}<div className="sidebar-bottom"><div className="privacy-note"><span>◈</span><div><strong>Локально и приватно</strong><small>Данные только на этом устройстве</small></div></div></div></aside><div className="app-main"><header className="mobile-header"><div className="brand"><span className="brand-mark">G</span><span>GYM<span>APP</span></span></div></header>{page}</div><div className="mobile-nav">{renderNav(true)}</div></main>;
}
