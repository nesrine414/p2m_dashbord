import apiClient from './api';

export const AUTH_TOKEN_KEY = 'nqms_auth_token';

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'customer';
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

export const getStoredToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);

export const setStoredToken = (token: string, persist: boolean): void => {
  if (persist) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const login = async (params: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<{ token: string; user: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'> }> => {
  const response = await apiClient.post<{
    token: string;
    user: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'>;
  }>(
    '/auth/login',
    params
  );
  return response.data;
};

export const register = async (params: {
  username?: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{ token: string; user: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'> }> => {
  const response = await apiClient.post<{
    token: string;
    user: Pick<AuthUser, 'id' | 'username' | 'email' | 'role'>;
  }>('/auth/register', params);
  return response.data;
};

export const me = async (): Promise<AuthUser> => {
  const response = await apiClient.get<AuthUser>('/auth/me');
  return response.data;
};
