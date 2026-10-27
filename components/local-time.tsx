'use client';

import { useEffect, useState } from 'react';

interface LocalTimeProps {
  iso: string | null | undefined;
  fallback?: string;
}

/**
 * Render an ISO timestamp in the viewer's local timezone.
 *
 * Rendering after mount avoids a server/client hydration mismatch (the server
 * has no access to the user's timezone).
 */
export function LocalTime({ iso, fallback = '—' }: LocalTimeProps) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setText(null);
      return;
    }
    const date = new Date(iso);
    setText(Number.isNaN(date.getTime()) ? null : date.toLocaleString());
  }, [iso]);

  return <time dateTime={iso ?? undefined}>{text ?? fallback}</time>;
}
