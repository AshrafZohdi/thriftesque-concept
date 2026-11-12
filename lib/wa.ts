// WhatsApp links. A number that isn't set or isn't valid gives no link, so the UI can hide the button instead of sending people nowhere.

export function waLink(number: string, text: string): string | null {
  if (!/^\d{8,15}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function askAboutPiece(p: { name: string; code: string }): string {
  return `Hi Thriftesque, is the ${p.name} (${p.code}) still available?`;
}
