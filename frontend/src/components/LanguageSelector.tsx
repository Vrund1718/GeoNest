import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLng = i18n.language || 'en';

  return (
    <div className="relative inline-flex items-center gap-1.5 bg-sand-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-medium">
      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-1.5 shrink-0" />
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          currentLng.startsWith('en')
            ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white font-semibold shadow-xs'
            : 'text-ink/70 dark:text-slate-300 hover:text-ink dark:hover:text-white'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('hi')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          currentLng.startsWith('hi')
            ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white font-semibold shadow-xs'
            : 'text-ink/70 dark:text-slate-300 hover:text-ink dark:hover:text-white'
        }`}
        title="हिंदी"
      >
        HI
      </button>
      <button
        onClick={() => changeLanguage('gu')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          currentLng.startsWith('gu')
            ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white font-semibold shadow-xs'
            : 'text-ink/70 dark:text-slate-300 hover:text-ink dark:hover:text-white'
        }`}
        title="ગુજરાતી"
      >
        GU
      </button>
    </div>
  );
};
