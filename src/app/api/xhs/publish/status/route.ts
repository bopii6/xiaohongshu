import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const MAX_LINES = 200;

function tailLines(text: string, maxLines: number) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return lines;
  return lines.slice(-maxLines);
}

function isValidJobId(jobId: string) {
  return /^xhs_[a-z0-9_]+$/i.test(jobId);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = (searchParams.get('jobId') || '').trim();

  if (!isValidJobId(jobId)) {
    return NextResponse.json({ success: false, error: 'invalid jobId' }, { status: 400 });
  }

  const logPath = path.join(process.cwd(), 'data', 'publish', `${jobId}.log`);

  try {
    const text = await readFile(logPath, 'utf-8');
    const lines = tailLines(text, MAX_LINES);
    const exitMatch = text.match(/exit code:\s*(\d+)/i);
    const exitCode = exitMatch ? Number.parseInt(exitMatch[1], 10) : null;
    const finished = exitCode !== null;
    const status = finished ? (exitCode === 0 ? 'success' : 'failed') : 'running';

    return NextResponse.json({
      success: true,
      status,
      finished,
      exitCode,
      lines
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'log not found' },
      { status: 404 }
    );
  }
}
