import { Suspense } from 'react';
import SettingsPage from '@/components/SettingsPage';

export const metadata = {
  title: 'Jarvis — Settings',
};

export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
