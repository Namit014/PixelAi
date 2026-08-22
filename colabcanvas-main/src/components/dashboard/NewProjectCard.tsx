import { Card } from "@/components/ui/card";
import dotBackground from "@/assets/dot_background.svg";
import createProjectCardTools from "@/assets/create_project_card.svg";
import createProjectCardButton from "@/assets/create_project_card_middle.svg";

interface NewProjectCardProps {
  onClick: () => void;
}

export const NewProjectCard = ({ onClick }: NewProjectCardProps) => {
  return (
    <Card
      className="group relative cursor-pointer overflow-hidden hover-lift transition-all duration-300 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
      onClick={onClick}
    >
      {/* Main content area - square */}
      <div className="aspect-square relative flex items-center justify-center">
        {/* Background dot pattern */}
        <img
          src={dotBackground}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none"
          aria-hidden="true"
        />

        {/* Centered text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <h3 className="text-lg font-normal text-zinc-900 dark:text-zinc-100 text-center leading-tight group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-white group-hover:to-primary group-hover:bg-[length:300%_auto] group-hover:bg-clip-text group-hover:text-transparent group-hover:animate-gradient-shift transition-all duration-300">
            Create a new<br />project
          </h3>
        </div>

        {/* Tool icons bar at bottom with centered animated button */}
        <div className="absolute bottom-8 left-8 right-8 z-10">
          <div className="relative flex items-center justify-center">
            {/* Tools bar background */}
            <img
              src={createProjectCardTools}
              alt=""
              className="w-full h-10 object-contain"
              aria-hidden="true"
            />
            
            {/* Animated button - separate positioning from animation */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="group-hover:animate-bounce-soft">
                <img
                  src={createProjectCardButton}
                  alt="Create project"
                  className="w-8 h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Info section to match height of regular project cards */}
      <div className="p-3">
        {/* Empty section for height matching */}
      </div>
    </Card>
  );
};
