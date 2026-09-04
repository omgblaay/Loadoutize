import { Check, X } from "lucide-react";
import { cn } from "./utils";
import { getPasswordChecks, getPasswordStrength } from "../../utils/password";

const STRENGTH_COLOR: Record<string, string> = {
  weak: "bg-[#d4183d]",
  fair: "bg-[#f5a623]",
  strong: "bg-[#01a059]",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const checks = getPasswordChecks(password);
  const { strength, score } = getPasswordStrength(password);
  const barColor = STRENGTH_COLOR[strength];

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? barColor : "bg-white/10")}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((check) => (
          <span
            key={check.label}
            className={cn("flex items-center gap-1 text-xs", check.met ? "text-[#01a059]" : "text-neutral-500")}
          >
            {check.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}
