import type { LoginInfo } from './types/APITypes';

export function storeLogin(tok: LoginInfo): void {
  try {
    localStorage.setItem('token_data', tok.accessToken);
    localStorage.setItem('user_data', tok.userId);
  }
  catch (e) {
    console.log(e);
  }
}

export function retrieveLogin(): LoginInfo {
  let ud: string | null = null;
  let token: string | null = null;
  try {
    ud = localStorage.getItem('token_data');
    token = localStorage.getItem('user_data');
  }
  catch (e) {
    console.log(e);
  }
  if (ud !== null && token !== null) {
    return { accessToken: ud, userId: token };
  } else {
    throw new Error("No token found in localStorage");
  }
}

export function isLoginValid(): boolean {
  try {
    const token = retrieveLogin();
    return !!token.accessToken && !!token.userId;
  } catch {
    return false;
  }
}

export function clearToken(): void {
  localStorage.removeItem('token_data');
  localStorage.removeItem('user_data');
}
