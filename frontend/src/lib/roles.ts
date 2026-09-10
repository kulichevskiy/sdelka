export type Role = 'owner' | 'admin' | 'member'

export const roleLabels: Record<Role, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  member: 'Менеджер по продажам',
}

export function roleLabel(role: Role): string {
  return roleLabels[role]
}

/** Owner и admin настраивают организацию; member только работает с данными */
export function canAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin'
}
