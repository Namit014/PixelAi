import { useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface AssetFlowIndicatorProps {
  from: string;
  to: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export const AssetFlowIndicator = ({ from, to, status, message }: AssetFlowIndicatorProps) => {
  useEffect(() => {
    if (status === 'success') {
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <div className="flex items-center gap-2">
            <span className="capitalize">{from}</span>
            <ArrowRight className="w-3 h-3" />
            <span className="capitalize">{to}</span>
          </div>
        </div>,
        {
          description: message || 'Asset transferred successfully'
        }
      );
    } else if (status === 'error') {
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <div className="flex items-center gap-2">
            <span className="capitalize">{from}</span>
            <ArrowRight className="w-3 h-3" />
            <span className="capitalize">{to}</span>
          </div>
        </div>,
        {
          description: message || 'Asset transfer failed'
        }
      );
    } else {
      toast.loading(
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="capitalize">{from}</span>
            <ArrowRight className="w-3 h-3 animate-pulse" />
            <span className="capitalize">{to}</span>
          </div>
        </div>,
        {
          description: message || 'Transferring asset...'
        }
      );
    }
  }, [from, to, status, message]);

  return null;
};