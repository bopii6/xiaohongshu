/**
 * Xiaohongshu Publish API - xiaohongshu-mcp Backend
 * 
 * This route uses the xiaohongshu-mcp service for more stable publishing.
 * Falls back to Python script if MCP service is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import {
  checkServiceHealth,
  publishContent,
  publishVideo,
  type PublishParams,
} from '@/lib/xhs-mcp-client';

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

// Check if we should use xiaohongshu-mcp
const USE_MCP = process.env.XHS_USE_MCP !== 'false';

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

/**
 * Publish using xiaohongshu-mcp service
 */
async function publishWithMCP(payload: PublishPayload): Promise<{ success: boolean; error?: string; output?: string }> {
  const noteType = resolveNoteType(payload);

  // Combine content with tags
  let fullContent = payload.content || '';
  if (payload.tags?.length) {
    fullContent += '\n\n' + payload.tags.map(t => `#${t}`).join(' ');
  }

  const params: PublishParams = {
    title: payload.title,
    content: fullContent,
    images: payload.images,
  };

  if (noteType === 'video') {
    params.video = payload.videoUrl;
    const result = await publishVideo(params);
    return {
      success: result.success,
      error: result.error,
      output: result.message,
    };
  } else {
    const result = await publishContent(params);
    return {
      success: result.success,
      error: result.error,
      output: result.message,
    };
  }
}

/**
 * Publish using Python script (fallback)
 */
async function publishWithPython(payload: PublishPayload): Promise<{ success: boolean; error?: string; output?: string }> {
  const noteType = resolveNoteType(payload);
  const workDir = path.join(process.cwd(), 'data', 'publish');
  await mkdir(workDir, { recursive: true });
  const payloadPath = path.join(workDir, `xhs_publish_${Date.now()}.json`);
  await writeFile(payloadPath, JSON.stringify({ ...payload, noteType }, null, 2), 'utf-8');

  const python = process.env.PYTHON_BIN || process.env.PYTHON || 'python';
  const scriptPath = path.join(process.cwd(), 'scripts', 'xhs_publish.py');
  const args = [scriptPath, '--payload', payloadPath];
  const timeoutMs = Number.parseInt(process.env.XHS_PUBLISH_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;

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
    return {
      success: false,
      error: output.stderr || output.stdout || '发布失败，请检查日志',
    };
  }

  return { success: true, output: output.stdout };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const payload = sanitizePayload(await request.json());

    // Validate
    if (!payload.title || !payload.content) {
      return NextResponse.json({ success: false, error: '标题和文案不能为空' }, { status: 400 });
    }

    const noteType = resolveNoteType(payload);
    if (noteType === 'video') {
      if (!payload.videoUrl) {
        return NextResponse.json({ success: false, error: '视频链接缺失，无法发布视频' }, { status: 400 });
      }
    } else if (!payload.images || payload.images.length === 0) {
      return NextResponse.json({ success: false, error: '图片笔记至少需要一张图片' }, { status: 400 });
    }

    // Try xiaohongshu-mcp first if enabled
    if (USE_MCP) {
      const mcpHealthy = await checkServiceHealth();

      if (mcpHealthy) {
        console.log('[XHS publish] Using xiaohongshu-mcp service');
        const result = await publishWithMCP(payload);

        if (result.success) {
          return NextResponse.json({ success: true, output: result.output, backend: 'mcp' });
        }

        // If MCP failed, log and fall through to Python
        console.warn('[XHS publish] MCP failed, falling back to Python:', result.error);
      } else {
        console.log('[XHS publish] MCP service not available, using Python fallback');
      }
    }

    // Fallback to Python script
    if (!process.env.XHS_COOKIE) {
      return NextResponse.json({ success: false, error: '未配置XHS_COOKIE，无法自动发布' }, { status: 500 });
    }

    console.log('[XHS publish] Using Python script');
    const result = await publishWithPython(payload);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, output: result.output, backend: 'python' });
  } catch (error) {
    console.error('[XHS publish] error', error);
    const message = error instanceof Error ? error.message : '发布失败，请稍后重试';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
