// public/js/shared/i18n.js
const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

/** Convert ASCII digits in a string to Arabic-Indic. */
export function toArDigits(str) {
  return String(str).replace(/[0-9]/g, d => AR_DIGITS[+d]);
}

export const LIKERT_LABELS = {
  strongly_disagree: 'لا أوافق بشدة',
  disagree:          'لا أوافق',
  neutral:           'محايد',
  agree:             'أوافق',
  strongly_agree:    'أوافق بشدة',
};

export const LIKERT_ORDER = ['strongly_disagree','disagree','neutral','agree','strongly_agree'];
