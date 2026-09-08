'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/components/providers/locale-provider';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';

const languages = [
  { code: 'en' as const, name: 'English', nativeName: 'English' },
  { code: 'fr' as const, name: 'French', nativeName: 'Français' },
  { code: 'ar' as const, name: 'Arabic', nativeName: 'العربية' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations('settings');

  const handleLanguageChange = async (newLocale: 'en' | 'fr' | 'ar') => {
    if (newLocale === locale) return;

    try {
      await setLocale(newLocale);
      toast.success(t('toasts.languageChanged', { language: languages.find(l => l.code === newLocale)?.name ?? newLocale }));
    } catch (error) {
      toast.error(t('toasts.languageChangeFailed'));
    }
  };

  const currentLanguage = languages.find(l => l.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t('language.selectLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="cursor-pointer"
          >
            <span className={locale === lang.code ? 'font-semibold' : ''}>
              {lang.nativeName}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
