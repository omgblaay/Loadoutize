import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { NavIcon } from "./nav-icon-3d";

interface CountdownProps {
  targetDate: Date;
  label: string;
  accent: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(targetDate: Date): TimeLeft {
  const diff = Math.max(0, targetDate.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[44px]">
      <span className="text-[20px] leading-[24px] text-[#fafafa] font-semibold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs uppercase text-teritary">{label}</span>
    </div>
  );
}

export function Countdown({ targetDate, label, accent }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const done = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] px-5 py-3.5">
      <div className="flex flex-1 items-center gap-2.5">
        <NavIcon
          icon="clock"
          flat={<Clock className="w-4 h-4 shrink-0 text-teritary" />}
          active
          hovered={false}
          size={16}
        />
        {label}
      </div>
      {done ? (
        <span className="text-[14px] text-[#fafafa] font-semibold">It's here!</span>
      ) : (
        <div className="flex items-center gap-3">
          <Unit value={timeLeft.days} label="Days" />
          <Unit value={timeLeft.hours} label="Hrs" />
          <Unit value={timeLeft.minutes} label="Min" />
          <Unit value={timeLeft.seconds} label="Sec" />
        </div>
      )}
    </div>
  );
}
