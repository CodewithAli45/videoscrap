import path from 'path';
import type { Database } from 'sqlite';

let dbInstance: Database | null = null;

export interface DownloadJob {
  job_id: string;
  url: string;
  title: string;
  thumbnail?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  percent: number;
  file_path?: string;
  error?: string;
  created_at: string;
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Lazy-load native C++ modules at runtime to completely prevent Vercel static build evaluation crashes
  const sqlite3 = await import('sqlite3');
  const { open } = await import('sqlite');

  // On Vercel or Serverless, process.cwd() is read-only. Use /tmp/ downloads.db as a writable fallback.
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const dbPath = isServerless 
    ? path.join('/tmp', 'downloads.db') 
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'downloads.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.default.Database
  });

  // Create table if it doesn't exist
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      job_id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail TEXT,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
      percent REAL DEFAULT 0.0,
      file_path TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  return dbInstance;
}

export async function getHistory(): Promise<DownloadJob[]> {
  const db = await getDb();
  return db.all<DownloadJob[]>(`
    SELECT * FROM downloads 
    ORDER BY datetime(created_at) DESC 
    LIMIT 10
  `);
}

export async function addJob(job: Omit<DownloadJob, 'created_at' | 'percent'>): Promise<void> {
  const db = await getDb();
  await db.run(`
    INSERT INTO downloads (job_id, url, title, thumbnail, status, percent, file_path, error)
    VALUES (?, ?, ?, ?, ?, 0.0, ?, ?)
  `, [job.job_id, job.url, job.title, job.thumbnail || null, job.status, job.file_path || null, job.error || null]);
}

export async function updateJobProgress(job_id: string, percent: number, status: DownloadJob['status'], file_path?: string, error?: string): Promise<void> {
  const db = await getDb();
  if (file_path !== undefined && error !== undefined) {
    await db.run(`
      UPDATE downloads 
      SET percent = ?, status = ?, file_path = ?, error = ?
      WHERE job_id = ?
    `, [percent, status, file_path, error, job_id]);
  } else if (file_path !== undefined) {
    await db.run(`
      UPDATE downloads 
      SET percent = ?, status = ?, file_path = ?
      WHERE job_id = ?
    `, [percent, status, file_path, job_id]);
  } else if (error !== undefined) {
    await db.run(`
      UPDATE downloads 
      SET percent = ?, status = ?, error = ?
      WHERE job_id = ?
    `, [percent, status, error, job_id]);
  } else {
    await db.run(`
      UPDATE downloads 
      SET percent = ?, status = ?
      WHERE job_id = ?
    `, [percent, status, job_id]);
  }
}

export async function getJob(job_id: string): Promise<DownloadJob | undefined> {
  const db = await getDb();
  return db.get<DownloadJob>(`
    SELECT * FROM downloads WHERE job_id = ?
  `, [job_id]);
}

export async function clearAllDbJobs(): Promise<void> {
  const db = await getDb();
  await db.run(`DELETE FROM downloads`);
}
