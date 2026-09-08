'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { getApiUrl } from '@/lib/runtime-config';

export default function ChangePasswordPage() {
  const router = useRouter();
  const t = useTranslations('misc');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordRequirements = [
    { label: t('changePassword.requirements.minLength'), test: (p: string) => p.length >= 12 },
    { label: t('changePassword.requirements.uppercase'), test: (p: string) => /[A-Z]/.test(p) },
    { label: t('changePassword.requirements.lowercase'), test: (p: string) => /[a-z]/.test(p) },
    { label: t('changePassword.requirements.number'), test: (p: string) => /[0-9]/.test(p) },
    { label: t('changePassword.requirements.specialChar'), test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errors.passwordsDoNotMatch'));
      return;
    }

    const allRequirementsMet = passwordRequirements.every((req) => req.test(newPassword));
    if (!allRequirementsMet) {
      setError(t('changePassword.errors.requirementsNotMet'));
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('changePassword.errors.changeFailed'));
      }

      setSuccess(true);

      // Clear tokens and redirect to login after 2 seconds
      setTimeout(() => {
        localStorage.clear();
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('changePassword.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-600 text-white mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('changePassword.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('changePassword.subtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('changePassword.successTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('changePassword.redirecting')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('changePassword.currentPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="block w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('changePassword.newPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="block w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('changePassword.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="block w-full pl-3 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('changePassword.requirementsTitle')}
                </p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => {
                    const isMet = req.test(newPassword);
                    return (
                      <li
                        key={index}
                        className={`text-sm flex items-center ${
                          isMet
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {isMet ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <div className="w-4 h-4 mr-2 rounded-full border-2 border-current" />
                        )}
                        {req.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('changePassword.submitting') : t('changePassword.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
