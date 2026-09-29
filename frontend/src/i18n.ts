import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      search_pgs: 'Search PGs',
      recommended: 'Recommended',
      filters: 'Filters',
      monthly_rent: 'Monthly Rent',
      amenities: 'Amenities',
      view_details: 'View Details',
      book_now: 'Request to book',
      dashboard: 'Dashboard',
    },
  },
  hi: {
    translation: {
      search_pgs: 'पीजी खोजें',
      recommended: 'अनुशंसित',
      filters: 'फ़िल्टर',
      monthly_rent: 'मासिक किराया',
      amenities: 'सुविधाएं',
      view_details: 'विवरण देखें',
      book_now: 'बुक करने का अनुरोध',
      dashboard: 'डैशबोर्ड',
    },
  },
  gu: {
    translation: {
      search_pgs: 'પીજી શોધો',
      recommended: 'ભલામણ કરેલ',
      filters: 'ફિલ્ટર્સ',
      monthly_rent: 'માસિક ભાડું',
      amenities: 'સુવિધાઓ',
      view_details: 'વિગતો જુઓ',
      book_now: 'બુક કરવા માટે વિનંતી',
      dashboard: 'ડેશબોર્ડ',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
