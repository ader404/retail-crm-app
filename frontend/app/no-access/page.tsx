'use client';

import { useTranslations } from 'next-intl';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function NoAccessPage() {
  const t = useTranslations('misc.noAccess');
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
          <ShieldOff className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
