'use client';

import { useState } from 'react';
import { useAI } from '@/hooks/useAI';

export default function TestAIPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const { loading, error, generateText, generateTextStreaming } = useAI({ provider: 'tencent' });

  const handleGenerate = async () => {
    if (!input.trim()) return;

    try {
      const response = await generateText({
        messages: [
          { role: 'system', content: '你是一个专业的文案助手，请用简洁明了的语言回答问题。' },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      setOutput(response.choices[0].message.content);
    } catch (err) {
      console.error('生成失败:', err);
    }
  };

  const handleStreaming = () => {
    if (!input.trim()) return;

    setOutput('');
    generateTextStreaming(
      {
        messages: [
          { role: 'system', content: '你是一个专业的文案助手，请用简洁明了的语言回答问题。' },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      chunk => {
        setOutput(prev => prev + chunk);
      },
      completeText => {
        console.log('流式生成完成:', completeText);
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI服务测试</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">输入内容:</label>
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="请输入您的问题或要求..."
          className="w-full p-3 border border-gray-300 rounded-md h-32"
        />
      </div>

      <div className="mb-6 space-x-4">
        <button
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '生成中...' : '普通生成'}
        </button>

        <button
          onClick={handleStreaming}
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '流式生成中...' : '流式生成'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-md text-red-700">
          错误: {error.message}
        </div>
      )}

      {output && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">生成结果:</h3>
          <div className="p-4 bg-gray-100 rounded-md whitespace-pre-wrap">{output}</div>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h3 className="text-lg font-semibold mb-2">测试说明:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>当前已固定接入腾讯云混元大模型</li>
          <li>输入问题并选择普通或流式生成模式</li>
          <li>查看输出确认提示词效果</li>
          <li>如有错误提示请根据消息排查环境或网络</li>
        </ul>
      </div>
    </div>
  );
}
