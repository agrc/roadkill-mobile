import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import translations from './translations.json';

const i18n = new I18n(translations);

export const locale = getLocales()[0].languageCode;
console.log(`locale set to ${locale}`);
i18n.locale = locale;

export default i18n.t.bind(i18n);
