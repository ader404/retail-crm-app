'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import api from '@/lib/api';

import enCommon from '@/i18n/translations/en/common.json';
import frCommon from '@/i18n/translations/fr/common.json';
import arCommon from '@/i18n/translations/ar/common.json';
import enAuth from '@/i18n/translations/en/auth.json';
import frAuth from '@/i18n/translations/fr/auth.json';
import arAuth from '@/i18n/translations/ar/auth.json';
import enDashboard from '@/i18n/translations/en/dashboard.json';
import frDashboard from '@/i18n/translations/fr/dashboard.json';
import arDashboard from '@/i18n/translations/ar/dashboard.json';
import enCustomers from '@/i18n/translations/en/customers.json';
import frCustomers from '@/i18n/translations/fr/customers.json';
import arCustomers from '@/i18n/translations/ar/customers.json';
import enSuppliers from '@/i18n/translations/en/suppliers.json';
import frSuppliers from '@/i18n/translations/fr/suppliers.json';
import arSuppliers from '@/i18n/translations/ar/suppliers.json';
import enLoans from '@/i18n/translations/en/loans.json';
import frLoans from '@/i18n/translations/fr/loans.json';
import arLoans from '@/i18n/translations/ar/loans.json';
import enPos from '@/i18n/translations/en/pos.json';
import frPos from '@/i18n/translations/fr/pos.json';
import arPos from '@/i18n/translations/ar/pos.json';
import enProducts from '@/i18n/translations/en/products.json';
import frProducts from '@/i18n/translations/fr/products.json';
import arProducts from '@/i18n/translations/ar/products.json';
import enProfit from '@/i18n/translations/en/profit.json';
import frProfit from '@/i18n/translations/fr/profit.json';
import arProfit from '@/i18n/translations/ar/profit.json';
import enPurchaseOrders from '@/i18n/translations/en/purchaseOrders.json';
import frPurchaseOrders from '@/i18n/translations/fr/purchaseOrders.json';
import arPurchaseOrders from '@/i18n/translations/ar/purchaseOrders.json';
import enSales from '@/i18n/translations/en/sales.json';
import frSales from '@/i18n/translations/fr/sales.json';
import arSales from '@/i18n/translations/ar/sales.json';
import enRevenue from '@/i18n/translations/en/revenue.json';
import frRevenue from '@/i18n/translations/fr/revenue.json';
import arRevenue from '@/i18n/translations/ar/revenue.json';
import enExpenses from '@/i18n/translations/en/expenses.json';
import frExpenses from '@/i18n/translations/fr/expenses.json';
import arExpenses from '@/i18n/translations/ar/expenses.json';
import enEmployees from '@/i18n/translations/en/employees.json';
import frEmployees from '@/i18n/translations/fr/employees.json';
import arEmployees from '@/i18n/translations/ar/employees.json';
import enReports from '@/i18n/translations/en/reports.json';
import frReports from '@/i18n/translations/fr/reports.json';
import arReports from '@/i18n/translations/ar/reports.json';
import enReceipt from '@/i18n/translations/en/receipt.json';
import frReceipt from '@/i18n/translations/fr/receipt.json';
import arReceipt from '@/i18n/translations/ar/receipt.json';
import enSettings from '@/i18n/translations/en/settings.json';
import frSettings from '@/i18n/translations/fr/settings.json';
import arSettings from '@/i18n/translations/ar/settings.json';
import enMisc from '@/i18n/translations/en/misc.json';
import frMisc from '@/i18n/translations/fr/misc.json';
import arMisc from '@/i18n/translations/ar/misc.json';
import enCheques from '@/i18n/translations/en/cheques.json';
import frCheques from '@/i18n/translations/fr/cheques.json';
import arCheques from '@/i18n/translations/ar/cheques.json';
import enPageAccess from '@/i18n/translations/en/pageAccess.json';
import frPageAccess from '@/i18n/translations/fr/pageAccess.json';
import arPageAccess from '@/i18n/translations/ar/pageAccess.json';
import enNotifications from '@/i18n/translations/en/notifications.json';
import frNotifications from '@/i18n/translations/fr/notifications.json';
import arNotifications from '@/i18n/translations/ar/notifications.json';
import enExport from '@/i18n/translations/en/export.json';
import frExport from '@/i18n/translations/fr/export.json';
import arExport from '@/i18n/translations/ar/export.json';

type Locale = 'en' | 'fr' | 'ar';

const MESSAGES: Record<Locale, any> = {
  en: { ...enCommon, auth: enAuth, dashboard: enDashboard, customers: enCustomers, suppliers: enSuppliers, loans: enLoans, pos: enPos, products: enProducts, profit: enProfit, purchaseOrders: enPurchaseOrders, sales: enSales, revenue: enRevenue, expenses: enExpenses, employees: enEmployees, reports: enReports, settings: enSettings, misc: enMisc, receipt: enReceipt, cheques: enCheques, pageAccess: enPageAccess, notifications: enNotifications, export: enExport },
  fr: { ...frCommon, auth: frAuth, dashboard: frDashboard, customers: frCustomers, suppliers: frSuppliers, loans: frLoans, pos: frPos, products: frProducts, profit: frProfit, purchaseOrders: frPurchaseOrders, sales: frSales, revenue: frRevenue, expenses: frExpenses, employees: frEmployees, reports: frReports, settings: frSettings, misc: frMisc, receipt: frReceipt, cheques: frCheques, pageAccess: frPageAccess, notifications: frNotifications, export: frExport },
  ar: { ...arCommon, auth: arAuth, dashboard: arDashboard, customers: arCustomers, suppliers: arSuppliers, loans: arLoans, pos: arPos, products: arProducts, profit: arProfit, purchaseOrders: arPurchaseOrders, sales: arSales, revenue: arRevenue, expenses: arExpenses, employees: arEmployees, reports: arReports, settings: arSettings, misc: arMisc, receipt: arReceipt, cheques: arCheques, pageAccess: arPageAccess, notifications: arNotifications, export: arExport },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  dir: 'ltr' | 'rtl';
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  // Determine initial locale from localStorage user object or fallback
  const getInitialLocale = (): Locale => {
    if (initialLocale) return initialLocale;
    if (typeof window === 'undefined') return 'en';

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.locale && ['en', 'fr', 'ar'].includes(user.locale)) {
          return user.locale as Locale;
        }
      }

      const storedLocale = localStorage.getItem('locale');
      if (storedLocale && ['en', 'fr', 'ar'].includes(storedLocale)) {
        return storedLocale as Locale;
      }
    } catch (error) {
      console.error('Failed to load locale from storage:', error);
    }

    return 'ar';
  };

  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const messages = MESSAGES[locale];

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Update document dir and lang attributes
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale, dir]);

  const setLocale = async (newLocale: Locale) => {
    try {
      // Update backend
      await api.patch('/auth/locale', { locale: newLocale });

      // Update local state
      setLocaleState(newLocale);

      // Update user object in localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.locale = newLocale;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (error) {
        console.error('Failed to update user locale in storage:', error);
      }

      // Persist to localStorage as fallback
      localStorage.setItem('locale', newLocale);
    } catch (error) {
      console.error('Failed to update locale:', error);
      throw error;
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
