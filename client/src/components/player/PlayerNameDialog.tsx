import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PlayerNameDialogProps {
  onSubmit: (name: string) => Promise<void>;
  loading?: boolean;
}

export function PlayerNameDialog({ onSubmit, loading }: PlayerNameDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('נא להזין שם');
      return;
    }
    try {
      setError('');
      await onSubmit(name.trim());
    } catch (err: any) {
      setError(err.message || 'שגיאה');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🏓</div>
          <CardTitle>פיקלבול - תיאום משחקים</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="השם שלך"
                value={name}
                onChange={e => setName(e.target.value)}
                className="text-center"
                autoFocus
              />
              {error && <p className="text-destructive text-sm mt-1">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'נכנס...' : 'כניסה'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
