import { useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export type BrowserSttStatus = "idle" | "listening" | "unsupported";

type UseBrowserSpeechRecognitionArgs = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
};

export function useBrowserSpeechRecognition({
  onPartial,
  onFinal,
  lang = "en-US",
}: UseBrowserSpeechRecognitionArgs) {
  const recognitionRef = useRef<any | null>(null);
  const [status, setStatus] = useState<BrowserSttStatus>("idle");

  const isSupported = useMemo(() => {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setStatus((s) => (s === "unsupported" ? s : "idle"));
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    // Reset any previous session
    stop();

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    recognitionRef.current = rec;

    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (event: any) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r?.[0]?.transcript ?? "";
        if (r.isFinal) finalText += t;
        else interim += t;
      }
      if (interim.trim()) onPartial?.(interim.trim());
      if (finalText.trim()) onFinal?.(finalText.trim());
    };

    rec.onerror = () => {
      stop();
    };

    rec.onend = () => {
      // Some browsers end automatically; keep status accurate.
      setStatus((s) => (s === "unsupported" ? s : "idle"));
      recognitionRef.current = null;
    };

    rec.start();
    setStatus("listening");
  }, [isSupported, lang, onFinal, onPartial, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isSupported,
    status,
    start,
    stop,
  };
}
