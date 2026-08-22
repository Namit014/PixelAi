import { useNavigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefetchNavigation } from "@/hooks/useDashboardData";
import CanvasIcon from "@/assets/icons/canvas-nav.svg?react";
import CosmoIcon from "@/assets/icons/cosmo-nav.svg?react";
import CovexIcon from "@/assets/icons/covex-nav.svg?react";
import ThinkIcon from "@/assets/icons/think.svg?react";
import TalentIcon from "@/assets/icons/companion-nav.svg?react";

const navItems = [
{ name: 'Canvas', icon: CanvasIcon, path: '/dashboard' },
{ name: 'Cosmo', icon: CosmoIcon, path: '/cosmo' },
{ name: 'Covex', icon: CovexIcon, path: '/covex' },
{ name: 'Cogent', icon: ThinkIcon, path: '/cogent' },
{ name: 'Companion', icon: TalentIcon, path: '/talent' }];


const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: "7px",
    paddingRight: "7px"
  },
  animate: (isExpanded: boolean) => ({
    gap: isExpanded ? "0.5rem" : 0,
    paddingLeft: "7px",
    paddingRight: "7px"
  })
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 }
};

const transition = { type: "spring" as const, stiffness: 500, damping: 30 };
const spanTransition = { type: "spring" as const, stiffness: 400, damping: 25 };

export const AppNavigation = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState<number | null>(null);
  const outsideClickRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { prefetchDashboard } = usePrefetchNavigation();

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLElement>, () => setSelected(null));

  const handleClick = (index: number, path: string) => {
    setSelected(index);
    navigate(path);
  };

  const handleMouseEnter = (path: string) => {
    if (!user?.id) return;
    if (path === '/dashboard') {
      prefetchDashboard(user.id);
    }
  };

  return (
    <nav
      ref={outsideClickRef}
      className={cn("inline-flex items-center gap-1 p-1.5 rounded-2xl bg-background/50 backdrop-blur-md border border-border shadow-sm", className)}>

      {navItems.map((item, index) => {
        const isActive = location.pathname === item.path ||
        item.path === '/dashboard' && location.pathname === '/canvas' ||
        item.path === '/cosmo' && (location.pathname === '/workflow' || location.pathname.startsWith('/cosmo')) ||
        item.path === '/cogent' && (location.pathname.startsWith('/cogent') || location.pathname.startsWith('/think')) ||
        item.path === '/covex' && location.pathname.startsWith('/covex');
        const isExpanded = selected === index || isActive;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.path}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isExpanded}
            transition={transition}
            onClick={() => handleClick(index, item.path)}
            onMouseEnter={() => handleMouseEnter(item.path)}
            className={cn("relative rounded-xl text-sm font-medium flex items-center justify-center py-[6px]",

            isExpanded ?
            "bg-foreground text-background" :
            "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>

            <Icon
              className={cn(
                "w-5 h-5 transition-colors",
                "[&_path]:stroke-current [&_circle]:stroke-current [&_line]:stroke-current [&_polyline]:stroke-current"
              )} />

            <AnimatePresence initial={false}>
              {isExpanded &&
              <motion.span
                variants={spanVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={spanTransition}
                className="overflow-hidden whitespace-nowrap text-xs">

                  {item.name}
                </motion.span>
              }
            </AnimatePresence>
          </motion.button>);

      })}
    </nav>);

};