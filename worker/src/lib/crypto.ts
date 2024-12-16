
export const hash = async (input: string) => {
  const data = new TextEncoder().encode(input);

  const digest = await crypto.subtle.digest(
    { name: 'SHA-256' },
    data,
  );

  // ref: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
