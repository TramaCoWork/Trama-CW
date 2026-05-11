/**
 * Interfaz abstracta de storage.
 * Permite migrar de disco local a S3/MinIO sin cambiar el resto del codigo.
 */
export interface StorageService {
  upload(file: Express.Multer.File, folder: string): Promise<{ url: string; path: string }>;
  delete(filePath: string): Promise<void>;
  getAbsolutePath(filePath: string): string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
