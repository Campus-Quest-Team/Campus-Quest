//local storage is saved across sessions. it's like cookies except it's cleared when ending private sessions
interface Token {
    accessToken: string;
}

export function storeToken(tok: Token): void
{
    try
    {
        localStorage.setItem('token_data', tok.accessToken);
    }
    catch(e)
    {
        console.log(e);
    }
}

export function retrieveToken(): Token
{
    let ud: string | null = null;
    try
    {
        ud = localStorage.getItem('token_data');
    }
    catch(e)
    {
        console.log(e);
    }
    if (ud !== null) {
        return { accessToken: ud };
    } else {
        throw new Error("No token found in localStorage");
    }
}

export function isTokenValid(): boolean {
  try {
    const token = retrieveToken();
    return !!token.accessToken;
  } catch{
    return false;
  }
}

export function clearToken(): void {
  localStorage.removeItem('token_data');
  localStorage.removeItem('user_data');
}
