import { RUMI_SKILLS, Skill } from '@/lib/rumiSkillsConfig';

interface SkillsPanelProps {
  onSkillSelect: (skill: Skill) => void;
}

export const SkillsPanel = ({ onSkillSelect }: SkillsPanelProps) => {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm text-foreground">Try these RUMI Skills</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Ready-to-use workflows for immediate results.
      </p>
      
      <div className="space-y-0.5">
        {RUMI_SKILLS.map(skill => {
          const IconComponent = skill.icon;
          return (
            <button
              key={skill.id}
              onClick={() => onSkillSelect(skill)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-zinc-50/80 transition-colors text-left w-full group"
            >
              <div className={`w-6 h-6 rounded-md ${skill.bgColor} flex items-center justify-center`}>
                <IconComponent className={`w-3 h-3 ${skill.color}`} />
              </div>
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                {skill.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsPanel;
