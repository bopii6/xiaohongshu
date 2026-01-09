import { NextRequest, NextResponse } from 'next/server';
import { detectSensitiveWords, calculateRiskLevel, type DetectedWord } from '@/lib/sensitive-words';

interface CheckRequest {
    content: string;
}

interface CheckResponse {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    detectedWords: DetectedWord[];
    highlightedText: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: CheckRequest = await request.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json(
                { success: false, error: '请输入要检测的内容' },
                { status: 400 }
            );
        }

        // Detect sensitive words
        const detectedWords = detectSensitiveWords(content);

        // Calculate overall risk level
        const riskLevel = calculateRiskLevel(detectedWords);

        // Generate highlighted text
        let highlightedText = escapeHtml(content);

        // Sort by word length (longest first) to avoid partial replacements
        const sortedWords = [...detectedWords].sort((a, b) => b.word.length - a.word.length);

        for (const detected of sortedWords) {
            const escapedWord = escapeHtml(detected.word);
            const regex = new RegExp(escapeRegex(escapedWord), 'gi');
            const colorClass = detected.level === 'critical' ? 'background-color: #fee2e2; color: #dc2626;' :
                detected.level === 'high' ? 'background-color: #ffedd5; color: #ea580c;' :
                    'background-color: #fef9c3; color: #ca8a04;';
            highlightedText = highlightedText.replace(
                regex,
                `<span style="${colorClass} padding: 0 2px; border-radius: 2px; font-weight: 500;">${escapedWord}</span>`
            );
        }

        // Add line breaks
        highlightedText = highlightedText.replace(/\n/g, '<br>');

        const response: CheckResponse = {
            riskLevel,
            detectedWords,
            highlightedText
        };

        return NextResponse.json({ success: true, data: response });

    } catch (error) {
        console.error('Sensitive check error:', error);
        return NextResponse.json(
            { success: false, error: '检测失败，请重试' },
            { status: 500 }
        );
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
