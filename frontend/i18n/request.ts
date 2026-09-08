import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // This will be overridden by our LocaleProvider on the client side
  // For now, default to 'en' for any server-side rendering
  const locale = 'en';

  return {
    locale,
    messages: (await import(`./translations/${locale}/common.json`)).default,
  };
});
