import { Suspense } from 'react';
import ChatPage from '@/components/ChatPage';

export const metadata = {
  title: 'Jarvis — Chat',
};

function Loading() {
  return (
    <div className="flex h-screen bg-[#0f0f14] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-2xl font-bold text-white animate-pulse">
          J
        </div>
        <p className="text-[#606070] text-sm">Loading…</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ChatPage />
    </Suspense>
  );
}
