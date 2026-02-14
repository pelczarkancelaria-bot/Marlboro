export type Role = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt?: unknown;
  lastLoginAt?: unknown;
}
