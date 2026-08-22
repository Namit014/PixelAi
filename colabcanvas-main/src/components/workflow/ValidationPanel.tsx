import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { validateWorkflow } from '@/lib/workflowExecution';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ValidationPanel = () => {
  const { nodes, edges } = useWorkflowStore();
  
  const validation = validateWorkflow(nodes, edges);
  const checks = [
    {
      label: 'No circular dependencies',
      passed: validation.valid && !validation.error?.includes('Circular'),
    },
    {
      label: 'All nodes connected',
      passed: validation.valid && !validation.error?.includes('not connected'),
    },
    {
      label: 'Under 1000 node limit',
      passed: nodes.length <= 1000,
    },
  ];

  if (validation.valid) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-semibold mb-2">Workflow validation failed:</div>
        <ul className="space-y-1">
          {checks.map((check, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              {check.passed ? (
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              {check.label}
            </li>
          ))}
        </ul>
        {validation.error && (
          <div className="mt-2 text-sm">{validation.error}</div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ValidationPanel;
