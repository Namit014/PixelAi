import { Button } from '@/components/ui/button';

interface OptionButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

const OptionButtons = ({ options, onSelect, disabled }: OptionButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {options.map((option, index) => (
        <Button
          key={index}
          variant="outline"
          className="text-sm h-auto py-2 px-3 rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-all whitespace-normal break-words text-left min-h-[40px] max-w-full"
          onClick={() => onSelect(option)}
          disabled={disabled}
        >
          <span className="font-normal break-words">{option}</span>
        </Button>
      ))}
    </div>
  );
};

export default OptionButtons;
