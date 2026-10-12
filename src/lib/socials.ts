// Kredilo's social pages. Fill in the URLs once the accounts exist — leave blank to hide a link.
export type Social = { key: 'whatsapp' | 'facebook' | 'x' | 'instagram'; label: string; url: string };

export const SOCIALS: Social[] = [
  { key: 'whatsapp', label: 'WhatsApp', url: '' },
  { key: 'facebook', label: 'Facebook', url: '' },
  { key: 'x', label: 'X', url: '' },
  { key: 'instagram', label: 'Instagram', url: '' },
];

export const socialUrl = (key: string) => SOCIALS.find((s) => s.key === key)?.url ?? '';
export const configuredSocials = () => SOCIALS.filter((s) => s.url.trim() !== '');
export const anySocialConfigured = () => configuredSocials().length > 0;
