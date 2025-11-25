import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { readHistory, writeHistory, HistoryEntry } from '@/lib/history-store';

const HISTORY_LIMIT = 100;

export async function GET() {
  const data = await readHistory();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, formData, content, media } = body as {
      type: HistoryEntry['type'];
      formData: HistoryEntry['formData'];
      content: HistoryEntry['content'];
      media?: string[];
    };

    if (
      !type ||
      !content?.title ||
      !content?.intro ||
      !Array.isArray(content?.highlights) ||
      !content?.closing ||
      !content?.tags
    ) {
      return NextResponse.json(
        { success: false, error: '缺少必要的内容，无法保存' },
        { status: 400 }
      );
    }

    const history = await readHistory();
    const entry: HistoryEntry = {
      id: randomUUID(),
      type,
      formData: {
        productName: formData?.productName || '',
        productCategory: formData?.productCategory || '',
        features: formData?.features || '',
        targetAudience: formData?.targetAudience || '',
        style: formData?.style || 'casual',
      },
      content,
      media: Array.isArray(media) ? media : [],
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
    await writeHistory(updatedHistory);

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('[History][POST] error:', error);
    return NextResponse.json(
      { success: false, error: '保存失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetId = url.searchParams.get('id');

    const history = await readHistory();
    const updatedHistory = targetId
      ? history.filter((item) => item.id !== targetId)
      : [];

    await writeHistory(updatedHistory);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[History][DELETE] error:', error);
    return NextResponse.json(
      { success: false, error: '删除失败，请稍后重试' },
      { status: 500 }
    );
  }
}
