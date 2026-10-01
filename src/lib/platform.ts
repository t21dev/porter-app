const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export const isMac = /Mac|iPhone|iPad/.test(ua);
