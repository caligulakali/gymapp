import { useState, type ChangeEvent } from 'react';
import type { DataTransferRepositoryPort } from '../domain/data-transfer-repository-port';
import { exportCsv, exportJson, exportGymApp, importGymApp } from '../domain/data-transfer-service';

type Props = {
  repository: DataTransferRepositoryPort;
  now?: () => string;
  download?: (content: string, filename: string, mimeType: string) => void;
  confirmImport?: () => boolean;
  onChanged?: () => void;
};

function defaultDownload(content: string, filename: string, mimeType: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: mimeType }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function DataTransferPage({ repository, now = () => new Date().toISOString(), download = defaultDownload, confirmImport = () => window.confirm('Заменить текущие локальные данные содержимым файла? Текущий черновик тренировки будет удалён.'), onChanged }: Props) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function getData() {
    setError(undefined);
    return repository.getData();
  }

  async function handleExport(format: 'gymapp' | 'json' | 'csv'): Promise<void> {
    try {
      const data = await getData();
      if (format === 'gymapp') download(exportGymApp(data, now()), 'gymapp-backup.gymapp', 'application/json');
      if (format === 'json') download(exportJson(data), 'gymapp-backup.json', 'application/json');
      if (format === 'csv') download(exportCsv(data), 'gymapp-workouts.csv', 'text/csv;charset=utf-8');
      setMessage('Резервная копия подготовлена');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось экспортировать данные');
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = importGymApp(await file.text());
      if (!confirmImport()) return;
      await repository.replaceData(data);
      onChanged?.();
      setError(undefined);
      setMessage('Данные успешно восстановлены');
    } catch (reason) {
      setMessage(undefined);
      setError(reason instanceof Error ? reason.message : 'Не удалось импортировать данные');
    }
  }

  return <section className="content-page" aria-labelledby="data-transfer-title">
    <header className="page-header"><div><p className="eyebrow">Данные</p><h1 id="data-transfer-title">Экспорт и импорт</h1><p className="muted">Резервная копия хранится только у тебя</p></div></header>
    <article className="chart-card data-transfer-card"><h2>Сохранить данные</h2><p className="muted">Скачай копию упражнений, шаблонов и истории тренировок.</p><div className="data-transfer-actions"><button className="primary-submit" type="button" onClick={() => void handleExport('gymapp')}>Скачать .gymapp</button><button className="secondary-button" type="button" onClick={() => void handleExport('json')}>Скачать JSON</button><button className="secondary-button" type="button" onClick={() => void handleExport('csv')}>Скачать CSV</button></div></article>
    <article className="chart-card data-transfer-card"><h2>Восстановить данные</h2><p className="muted">Импорт заменит текущие локальные данные после подтверждения.</p><label className="secondary-button import-file-label">Импортировать файл .gymapp<input type="file" accept=".gymapp,application/json" aria-label="Импортировать файл .gymapp" onChange={(event) => void handleImport(event)} /></label></article>
    {message && <p className="saved-message" role="status">{message}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </section>;
}
