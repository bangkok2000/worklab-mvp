'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Settings > Integrations tab
    router.replace('/app/settings?tab=integrations');
  }, [router]);

  return (
    <div style={{ 
      padding: '2rem', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '400px',
      color: '#94a3b8',
    }}>
      Redirecting to Settings...
    </div>
  );
}
