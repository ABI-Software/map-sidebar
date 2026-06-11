export function generateUUID() {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);

  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;

  const hex = Array.from(arr)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function capitalise(text) {
  if (!text) return '';
  const value = String(text);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatAlertText(text, { formatLines = false } = {}) {
  if (!text) return '';

  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const linkified = escaped.replace(
    /(https?:\/\/[^\s"<>\[]+)/g,
    (url) => {
      const parts = url.match(/^(.*?)([\].,;:!?]*)$/);
      const cleanUrl = parts ? parts[1] : url;
      const suffix = parts ? parts[2] : '';
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${suffix}`;
    }
  );

  const normalised = linkified
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  if (!formatLines) {
    return normalised;
  }

  return normalised
    .split('\n')
    .map((line) => {
      const withBoldLabel = line.replace(
        /^\s*([A-Za-z][^:<]{0,120}:)/,
        '<strong>$1</strong>'
      );
      return `<div class="alert-line">${withBoldLabel}</div>`;
    })
    .join('\n');
}

export function scrollToRef(vm, refName) {
  vm?.$nextTick(() => {
    const element = vm?.$refs?.[refName];
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  });
}
