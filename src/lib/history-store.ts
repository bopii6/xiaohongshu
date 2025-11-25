import { promises as fs } from 'fs';
import path from 'path';

export interface HistoryEntry {
  id: string;
  type: 'business' | 'ip';
  formData: {
    productName: string;
    productCategory: string;
    features: string;
    targetAudience: string;
    style: 'casual' | 'professional' | 'cute' | 'cool';
  };
  content: {
    title: string;
    intro: string;
    highlights: string[];
    closing: string;
    tags: string[];
  };
  media: string[];
  createdAt: string;
}

const dataDirectory = path.join(process.cwd(), 'data');
const historyFilePath = path.join(dataDirectory, 'history.json');

async function ensureDataFile() {
  await fs.mkdir(dataDirectory, { recursive: true });
  try {
    await fs.access(historyFilePath);
  } catch {
    await fs.writeFile(historyFilePath, '[]', 'utf-8');
  }
}

export async function readHistory(): Promise<HistoryEntry[]> {
  await ensureDataFile();
  const fileContent = await fs.readFile(historyFilePath, 'utf-8');
  try {
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed)) {
      return parsed as HistoryEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function writeHistory(history: HistoryEntry[]) {
  await ensureDataFile();
  await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
}
