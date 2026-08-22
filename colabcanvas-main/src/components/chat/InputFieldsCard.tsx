import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';

interface InputFieldsCardProps {
  fields: Array<{
    label: string;
    placeholder: string;
    value: string;
  }>;
  onSubmit: (answers: string[]) => void;
  disabled?: boolean;
}

const InputFieldsCard = ({ fields, onSubmit, disabled }: InputFieldsCardProps) => {
  const [values, setValues] = useState<string[]>(fields.map(f => f.value));

  const handleSubmit = () => {
    // Filter out empty values and submit
    const filledValues = values.filter(v => v.trim());
    if (filledValues.length > 0) {
      onSubmit(values);
    }
  };

  return (
    <div className="mt-3 bg-white rounded-xl border border-border p-4 space-y-3">
      {fields.map((field, index) => (
        <div key={index} className="space-y-1">
          <label className="text-sm font-medium text-gray-700 break-words whitespace-normal">{field.label}</label>
          <Input
            value={values[index]}
            onChange={(e) => {
              const newValues = [...values];
              newValues[index] = e.target.value;
              setValues(newValues);
            }}
            placeholder={field.placeholder}
            className="bg-gray-50 border-gray-200"
            disabled={disabled}
          />
        </div>
      ))}
      <Button
        onClick={handleSubmit}
        disabled={disabled || values.every(v => !v.trim())}
        className="w-full mt-4"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate
      </Button>
    </div>
  );
};

export default InputFieldsCard;
