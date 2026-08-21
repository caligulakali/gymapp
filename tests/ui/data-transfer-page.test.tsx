import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExportData } from '../../src/domain/data-transfer-service';
import { DataTransferPage } from '../../src/ui/data-transfer-page';

const data: ExportData = { exercises: [], templates: [], workouts: [] };

function repository() {
  return { getData: vi.fn().mockResolvedValue(data), replaceData: vi.fn().mockResolvedValue(undefined) };
}

describe('DataTransferPage', () => {
  it('exports a gymapp file through the injected downloader', async () => {
    const repo = repository();
    const download = vi.fn();
    render(<DataTransferPage repository={repo} now={() => '2026-08-18T12:00:00.000Z'} download={download} />);

    fireEvent.click(screen.getByRole('button', { name: 'Скачать .gymapp' }));

    await waitFor(() => expect(download).toHaveBeenCalledWith(expect.stringContaining('"format":"gymapp"'), 'gymapp-backup.gymapp', 'application/json'));
  });

  it('imports a selected gymapp file and shows success', async () => {
    const repo = repository();
    const onChanged = vi.fn();
    const payload = JSON.stringify({ format: 'gymapp', version: 1, exportedAt: '2026-08-18T12:00:00.000Z', ...data });
    render(<DataTransferPage repository={repo} now={() => '2026-08-18T12:00:00.000Z'} download={vi.fn()} confirmImport={() => true} onChanged={onChanged} />);

    fireEvent.change(screen.getByLabelText('Импортировать файл .gymapp'), {
      target: { files: [new File([payload], 'backup.gymapp', { type: 'application/json' })] }
    });

    await waitFor(() => expect(repo.replaceData).toHaveBeenCalledWith(data));
    expect(onChanged).toHaveBeenCalledOnce();
    expect(await screen.findByText('Данные успешно восстановлены')).toBeInTheDocument();
  });
});
