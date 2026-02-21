import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface WhatsAppButtonProps {
  pollId: number;
}

export function WhatsAppButton({ pollId }: WhatsAppButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const { text } = await api.getWhatsApp(pollId);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API not available
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleCopy}
    >
      {copied ? 'הועתק! ✓' : '📋 העתק הודעה לוואטסאפ'}
    </Button>
  );
}
