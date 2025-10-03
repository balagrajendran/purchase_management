export type Role = 'admin' | 'employee';
export type AuthUser = { id: string; email: string; role: Role; name: string } | null;

const read = (k: string) =>
  localStorage.getItem(k) ?? sessionStorage.getItem(k);

export function getAuthUser(): AuthUser {
  try {
    const raw = read('authUser');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getAuthRole(): Role | null {
  return getAuthUser()?.role ?? null;
}
