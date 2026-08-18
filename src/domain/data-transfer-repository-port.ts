import type { ExportData } from './data-transfer-service';

export interface DataTransferRepositoryPort {
  getData(): Promise<ExportData>;
  replaceData(data: ExportData): Promise<void>;
}
