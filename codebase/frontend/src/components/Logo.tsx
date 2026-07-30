import { Sparkles } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Sparkles size={21} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="brand-name">
          Lecture<span>AI</span>
        </span>
      )}
    </div>
  );
}
