import { useMemo } from 'react';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function useVisitor(): string {
  return useMemo(() => {
    let id = getCookie('visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      document.cookie = `visitor_id=${id}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
    }
    return id;
  }, []);
}
