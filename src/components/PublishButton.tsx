'use client';

import { useEffect, useRef, useState } from 'react';

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

type PublishStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export default function PublishButton({ content, publishData, disabled = false, className = '' }: PublishButtonProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [logLines, setLogLines] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        setIsPolling(false);
    };

    const startPolling = (id: string) => {
        stopPolling();
        setIsPolling(true);

        const poll = async () => {
            try {
                const response = await fetch(`/api/xhs/publish/status?jobId=${encodeURIComponent(id)}`, {
                    cache: 'no-store'
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    setPublishStatus('failed');
                    setLogLines(prev => [...prev, data.error || 'Failed to load publish logs']);
                    stopPolling();
                    return;
                }
                if (Array.isArray(data.lines)) {
                    setLogLines(data.lines);
                }
                if (data.status) {
                    setPublishStatus(data.status);
                }
                if (data.finished) {
                    stopPolling();
                }
            } catch (error) {
                setPublishStatus('failed');
                setLogLines(prev => [...prev, 'Network error while fetching publish logs']);
                stopPolling();
            }
        };

        poll();
        pollRef.current = setInterval(poll, 2000);
    };

    useEffect(() => () => stopPolling(), []);

    const handlePublish = async () => {
        if (!content || isPublishing || isPolling) return;
        setIsPublishing(true);

        try {
            if (publishData) {
                setShowLogs(true);
                setPublishStatus('queued');
                setLogLines([]);
                setJobId(null);

                const response = await fetch('/api/xhs/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(publishData)
                });
                const data = await response.json().catch(() => ({}));
                if (response.status === 202 && data.jobId) {
                    setJobId(data.jobId);
                    setPublishStatus('queued');
                    setLogLines([`Job queued: ${data.jobId}`, 'Waiting for logs...']);
                    startPolling(data.jobId);
                    return;
                }

                if (!response.ok || !data.success) {
                    throw new Error(data.error || '发布失败，请稍后重试');
                }

                setPublishStatus('success');
                setLogLines([data.output || '发布完成']);
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
            if (publishData) {
                setShowLogs(true);
                setPublishStatus('failed');
                setLogLines([message]);
            } else {
                alert(message);
            }
        } finally {
            setIsPublishing(false);
        }
    };

    const isBusy = isPublishing || isPolling;
    const statusText = {
        idle: '',
        queued: '任务已提交，等待处理...',
        running: '正在发布，请稍候...',
        success: '发布完成',
        failed: '发布失败'
    }[publishStatus];

    return (
        <div className="w-full">
            <button
                onClick={handlePublish}
                disabled={disabled || isBusy}
                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF2442] to-[#FF6B7A] text-white py-3 px-6 rounded-xl font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isBusy ? '发布中...' : '去发布'}
            </button>

            {publishData && showLogs && (
                <div className="mt-3 rounded-xl border border-[#F0F0F0] bg-white p-4 text-sm shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-[#333]">发布进度</div>
                        <button
                            type="button"
                            onClick={() => setShowLogs(false)}
                            className="text-xs text-[#999] hover:text-[#666]"
                        >
                            关闭
                        </button>
                    </div>
                    <div className="mt-1 text-xs text-[#999]">任务ID: {jobId || '-'}</div>
                    <div className="mt-2 h-48 overflow-auto rounded-lg bg-[#FAFAFA] p-3 font-mono text-xs whitespace-pre-wrap text-[#444]">
                        {logLines.length ? logLines.join('\n') : '等待日志...'}
                    </div>
                    {statusText && (
                        <div className="mt-2 text-xs text-[#666]">{statusText}</div>
                    )}
                </div>
            )}
        </div>
    );
}
