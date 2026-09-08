'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function ForbiddenPage() {
  const router = useRouter();
  const t = useTranslations('misc');
  const { getFirstAllowedRoute } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-6">
          <ShieldAlert className="w-12 h-12" />
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">{t('forbidden.code')}</h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('forbidden.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('forbidden.description')}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('forbidden.goBack')}
          </button>
          <button
            onClick={() => router.push(getFirstAllowedRoute())}
            className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {t('forbidden.goToDashboard')}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">{t('forbidden.needAccessTitle')}</strong>
            <br />
            {t('forbidden.needAccessDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
