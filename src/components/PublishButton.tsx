'use client';

import { useState } from 'react';

interface PublishPayload {
    title: string;
    content: string;
    tags?: string[];
    images?: string[];
    videoUrl?: string;
    noteType?: string;
    sourceUrl?: string;
}

interface PublishButtonProps {
    content: string;
    publishData?: PublishPayload;
    disabled?: boolean;
    className?: string;
}

export default function PublishButton({ content, publishData, disabled = false, className = '' }: PublishButtonProps) {
    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        if (!content || isPublishing) return;
        setIsPublishing(true);

        try {
            if (publishData) {
                const response = await fetch('/api/xhs/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(publishData)
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '发布失败，请稍后重试');
                }
                alert('发布任务已提交，请稍后在创作中心查看结果');
                return;
            }

            // Copy content to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = content;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            // Check if mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // Open Xiaohongshu app
                window.location.href = 'xhsdiscover://post';
            } else {
                // Open Xiaohongshu creator platform
                window.open('https://creator.xiaohongshu.com/publish/publish', '_blank');
            }
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : (publishData ? '发布失败，请稍后重试' : '复制失败，请手动复制');
            console.error(publishData ? 'Publish failed:' : 'Failed to copy:', err);
            alert(message);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <button
            onClick={handlePublish}
            disabled={disabled || isPublishing}
            className={`flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF2442] to-[#FF6B7A] text-white py-3 px-6 rounded-xl font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isPublishing ? '发布中...' : '去发布'}
        </button>
    );
}
