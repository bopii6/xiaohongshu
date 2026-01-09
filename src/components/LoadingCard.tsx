'use client';

interface LoadingCardProps {
    message?: string;
    subMessage?: string;
}

export default function LoadingCard({ message = '生成中...', subMessage }: LoadingCardProps) {
    return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
                {/* Spinning ring */}
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-pink-500 rounded-full animate-spin"></div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">✨</span>
                </div>
            </div>
            <p className="text-gray-800 font-medium mb-1">{message}</p>
            {subMessage && (
                <p className="text-gray-500 text-sm">{subMessage}</p>
            )}
        </div>
    );
}
