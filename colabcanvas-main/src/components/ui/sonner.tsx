import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      className="toaster group mb-24"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-100 group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-sm group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-2.5",
          description: "group-[.toast]:text-zinc-600 group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-zinc-900 group-[.toast]:text-white group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-zinc-200 group-[.toast]:text-zinc-700 group-[.toast]:rounded-lg",
        },
      }}
      style={{
        zIndex: 999999,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
