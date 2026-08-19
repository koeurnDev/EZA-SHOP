import { useEffect } from 'react';

export function usePingServer(user, tg, backendUrl) {
  useEffect(() => {
    if (!user?.id) return;
    const isDevelopment = import.meta.env.DEV;
    const startParam = tg?.initDataUnsafe?.start_param;
    let referredBy = null;
    if (startParam && startParam.startsWith('ref_')) {
      referredBy = startParam.replace('ref_', '');
    }

    const pingServer = async () => {
      try {
        await fetch(`${backendUrl}/api/ping`, {
          method: 'POST',
          headers: { 
            'x-tg-data': tg?.initData || '',
            'Content-Type': 'application/json',
            ...(isDevelopment && { 'X-Debug-Bypass': 'true' })
          },
          body: JSON.stringify({ referred_by: referredBy })
        });
      } catch (err) {
        // Silent fail
      }
    };
    
    pingServer();
    const interval = setInterval(pingServer, 10 * 60 * 1000); // 10 min
    return () => clearInterval(interval);
  }, [user?.id, tg?.initData, tg?.initDataUnsafe?.start_param, backendUrl]);
}
