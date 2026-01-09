import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

interface PublishPayload {
  title: string;
  content: string;
  tags?: string[];
  images?: string[];
  videoUrl?: string;
  noteType?: string;
  sourceUrl?: string;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function resolveNoteType(payload: PublishPayload): 'video' | 'note' {
  if (payload.noteType === 'video') return 'video';
  if (payload.videoUrl) return 'video';
  return 'note';
}

function sanitizePayload(payload: PublishPayload): PublishPayload {
  return {
    title: payload.title?.trim(),
    content: payload.content?.trim(),
    tags: Array.isArray(payload.tags) ? payload.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : [],
    images: Array.isArray(payload.images) ? payload.images.filter(url => typeof url === 'string' && url.trim().length > 0) : [],
    videoUrl: payload.videoUrl?.trim(),
    noteType: payload.noteType,
    sourceUrl: payload.sourceUrl?.trim()
  };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const payload = sanitizePayload(await request.json());
    if (!payload.title || !payload.content) {
      return NextResponse.json({ success: false, error: '标题和文案不能为空' }, { status: 400 });
    }

    if (!process.env.XHS_COOKIE) {
      return NextResponse.json({ success: false, error: '未配置XHS_COOKIE，无法自动发布' }, { status: 500 });
    }

    const noteType = resolveNoteType(payload);
    if (noteType === 'video') {
      if (!payload.videoUrl) {
        return NextResponse.json({ success: false, error: '视频链接缺失，无法发布视频' }, { status: 400 });
      }
    } else if (!payload.images || payload.images.length === 0) {
      return NextResponse.json({ success: false, error: '图片笔记至少需要一张图片' }, { status: 400 });
    }

    const workDir = path.join(process.cwd(), 'data', 'publish');
    await mkdir(workDir, { recursive: true });
    const payloadPath = path.join(workDir, `xhs_publish_${Date.now()}.json`);
    await writeFile(payloadPath, JSON.stringify({ ...payload, noteType }, null, 2), 'utf-8');

    const python = process.env.PYTHON_BIN || process.env.PYTHON || 'python';
    const scriptPath = path.join(process.cwd(), 'scripts', 'xhs_publish.py');
    const args = [scriptPath, '--payload', payloadPath];
    const timeoutMs = Number.parseInt(process.env.XHS_PUBLISH_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;
    const runAsync = process.env.XHS_PUBLISH_ASYNC === 'true';

    if (runAsync) {
      const jobId = `xhs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const logPath = path.join(workDir, `${jobId}.log`);
      const logStream = createWriteStream(logPath, { flags: 'a' });
      const child = spawn(python, args, {
        cwd: process.cwd(),
        env: { ...process.env },
        windowsHide: true
      });

      console.log('[XHS publish] queued', { jobId, logPath });

      child.stdout.on('data', chunk => {
        const text = chunk.toString();
        logStream.write(text);
        console.log('[XHS publish] stdout', text.trim());
      });
      child.stderr.on('data', chunk => {
        const text = chunk.toString();
        logStream.write(text);
        console.error('[XHS publish] stderr', text.trim());
      });
      child.on('error', err => {
        console.error('[XHS publish] spawn error', err);
        logStream.write(`spawn error: ${String(err)}\n`);
        logStream.end();
        unlink(payloadPath).catch(() => undefined);
      });
      child.on('close', code => {
        logStream.write(`exit code: ${code ?? 1}\n`);
        logStream.end();
        unlink(payloadPath).catch(() => undefined);
        if (code !== 0) {
          console.error('[XHS publish] exited with error', { jobId, code });
        }
      });

      child.unref();
      return NextResponse.json({ success: true, status: 'queued', jobId }, { status: 202 });
    }

    const output = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(python, args, {
        cwd: process.cwd(),
        env: { ...process.env },
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('发布超时，请稍后重试'));
      }, timeoutMs);

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });
      child.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
      child.on('close', code => {
        clearTimeout(timeout);
        resolve({ code: code ?? 1, stdout, stderr });
      });
    });

    await unlink(payloadPath).catch(() => undefined);

    if (output.code !== 0) {
      console.error('[XHS publish] python failed', {
        code: output.code,
        stderr: output.stderr,
        stdout: output.stdout
      });
      return NextResponse.json(
        { success: false, error: output.stderr || output.stdout || '发布失败，请检查日志' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, output: output.stdout });
  } catch (error) {
    console.error('[XHS publish] error', error);
    const message = error instanceof Error ? error.message : '发布失败，请稍后重试';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
