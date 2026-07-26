import fs from 'fs';
import path from 'path';

export function loadResourceFile(...relativePaths: string[]): string {
  try {
    const localPath = path.join(process.cwd(), 'recursos', ...relativePaths);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath, 'utf8');
    }
    throw new Error(`Archivo de recursos no encontrado: ${localPath}`);
  } catch (err: any) {
    console.error(`Error al cargar recurso ${relativePaths.join('/')}:`, err.message);
    throw err;
  }
}
