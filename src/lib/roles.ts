import type { AccountType, UserProfile } from '../types';

const ADMIN_ALIASES = new Set([
  'مدير',
  'مدير admin',
  'مدير النظام',
  'مدير عام',
  'المشرف العام',
  'مشرف',
  'مشرف النظام',
  'admin',
  'administrator',
  'supervisor',
]);

const OWNER_ALIASES = new Set(['صاحب قاعة', 'hall owner', 'owner']);
const PROVIDER_ALIASES = new Set(['مزود خدمة', 'service provider', 'provider']);

function normalizedRoleText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}

export function isAdminAccountType(value: unknown): boolean {
  return ADMIN_ALIASES.has(normalizedRoleText(value));
}

export function normalizeAccountType(value: unknown): AccountType {
  const role = normalizedRoleText(value);
  if (ADMIN_ALIASES.has(role)) return 'مدير';
  if (OWNER_ALIASES.has(role)) return 'صاحب قاعة';
  if (PROVIDER_ALIASES.has(role)) return 'مزود خدمة';
  return 'زبون';
}

export function normalizeUserProfile(
  value: (Partial<UserProfile> & { id: string }) | UserProfile,
): UserProfile {
  return {
    ...value,
    id: String(value.id || ''),
    name: typeof value.name === 'string' ? value.name : '',
    phone: typeof value.phone === 'string' ? value.phone : '',
    email: typeof value.email === 'string' ? value.email : '',
    city: typeof value.city === 'string' ? value.city : '',
    accountType: normalizeAccountType(value.accountType),
  } as UserProfile;
}
