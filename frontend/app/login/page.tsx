'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, getFirstAllowedRoute } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password, rememberMe);

      if (!success) {
        throw new Error(t('errors.loginFailed'));
      }

      // Get user data to check password change requirement
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.mustChangePassword) {
          router.push('/change-password');
          return;
        }
      }

      // Redirect to the first allowed page
      router.replace(getFirstAllowedRoute());
    } catch (err: any) {
      setError(err.message || t('errors.invalidCredentials'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-border">
                <img
                  src="/Logo.svg?v=2"
                  alt="ADERUIX"
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {t('welcomeBack')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('accessSubtitle')}
            </p>
          </div>

          {/* Form */}
          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-destructive/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                    </div>
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  {t('email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
                    placeholder={t('emailPlaceholder')}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  {t('password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-11 pr-12 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-foreground placeholder:text-muted-foreground"
                    placeholder={t('passwordPlaceholder')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0"
                    disabled={loading}
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-muted-foreground"
                  >
                    {t('rememberFor30Days')}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-primary-foreground"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{t('signingIn')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('signInButton')}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>{t('secureConnection')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5" style={{
          backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '4rem 4rem'
        }} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          <div className="max-w-lg space-y-8 text-center">
            <div className="inline-flex items-center justify-center">
              <div className="h-24 w-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl border border-border">
                <img
                  src="/Logo.svg?v=2"
                  alt="ADERUIX"
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {t('brandTitle')}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('brandDescription')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">{t('stats.support')}</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">99.9%</div>
                <div className="text-sm text-muted-foreground">{t('stats.uptime')}</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">1000+</div>
                <div className="text-sm text-muted-foreground">{t('stats.businesses')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
