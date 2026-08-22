import { Monitor, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import colabLogo from "@/assets/colab-logo.svg";
import colabWordmark from "@/assets/colab-wordmark.svg";

interface Props {
  toolName?: string;
}

export const DesktopOnlyScreen = ({ toolName = "This tool" }: Props) => {
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const mailto = `mailto:?subject=${encodeURIComponent(
    "Open this on your desktop"
  )}&body=${encodeURIComponent(
    `Open this Colab link on your desktop:\n\n${currentUrl}`
  )}`;

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={colabLogo} alt="Colab" className="w-12 h-12" />
          <img src={colabWordmark} alt="Colab" className="h-5" />
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-7 text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center">
              <Monitor className="w-7 h-7 text-zinc-700" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-zinc-900">
              Best on desktop
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {toolName} needs a larger screen to give you the precision and
              tools it deserves. Open this link on your laptop or desktop.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href={mailto}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Email me this link
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
