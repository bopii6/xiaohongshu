import { Suspense } from 'react';
import CreatePageClient from './CreatePageClient';

export const dynamic = 'force-dynamic';

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">加载中...</div>}>
      <CreatePageClient />
    </Suspense>
  );
}
