// Kredilo's social pages. Leave a url blank to hide that link and drop it from the follow gate.
export type Social = { key: 'whatsapp' | 'x' | 'instagram' | 'tiktok' | 'facebook'; label: string; url: string };

export const SOCIALS: Social[] = [
  { key: 'whatsapp', label: 'WhatsApp', url: 'https://whatsapp.com/channel/0029Vb8sIak3AzNSrtXn2M1X' },
  { key: 'x', label: 'X', url: 'https://x.com/officialkredilo' },
  { key: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/kredilo' },
  { key: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@kredilo7' },
  { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1FGyEY9N8H/' },
];

export const socialUrl = (key: string) => SOCIALS.find((s) => s.key === key)?.url ?? '';
export const configuredSocials = () => SOCIALS.filter((s) => s.url.trim() !== '');
export const anySocialConfigured = () => configuredSocials().length > 0;
