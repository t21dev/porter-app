import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AdminWarning() {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Porter is running without administrator privileges. To kill processes, please restart as Administrator.
      </AlertDescription>
    </Alert>
  );
}
