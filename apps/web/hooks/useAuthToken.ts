import { useCallback } from 'react';

export function useAuthToken() {
  const getToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();
      if (sessionData?.user) {
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const { token } = await tokenResponse.json();
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }, []);

  return getToken;
}