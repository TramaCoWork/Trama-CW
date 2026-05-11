import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly basePath: string;

  constructor() {
    const configuredPath = process.env.UPLOAD_PATH || 'uploads';
    this.basePath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  async upload(file: Express.Multer.File, folder: string): Promise<{ url: string; path: string }> {
    const dir = path.join(this.basePath, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(folder, filename);
    const absolutePath = path.join(this.basePath, filePath);

    fs.writeFileSync(absolutePath, file.buffer);

    return {
      url: `/uploads/${filePath}`,
      path: filePath,
    };
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = path.join(this.basePath, filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  getAbsolutePath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }
}
