import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

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

function AnimatedDigits({ value }: { value: number }) {
  const digits = String(value).padStart(2, "0").split("");

  return (
    <span
      className="inline-flex tabular-nums"
      aria-label={String(value).padStart(2, "0")}
    >
      {digits.map((digit, index) => (
        <span
          key={`${index}-${digit}`}
          aria-hidden="true"
          className="relative grid w-[0.66em] place-items-center"
        >
          <span className="countdown-digit-change col-start-1 row-start-1">
            {digit}
          </span>
        </span>
      ))}
    </span>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col text-[#fafafa]">
      <span className="font-mono text-[clamp(1.75rem,4vw,3.25rem)] font-medium leading-none tracking-[-0.08em] ">
        <AnimatedDigits value={value} />
      </span>
      <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-teritary sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export function Countdown({ targetDate, label, accent }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(targetDate),
  );

  useEffect(() => {
    const interval = setInterval(
      () => setTimeLeft(getTimeLeft(targetDate)),
      1000,
    );
    return () => clearInterval(interval);
  }, [targetDate]);

  const done =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  return (
    <div className="relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl bg-black/20 p-5 sm:min-h-64 sm:p-7">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none font-rating text-[clamp(9rem,22vw,15rem)] font-semibold leading-none tracking-[-0.1em] text-white/[0.045]"
      >
        {String(timeLeft.days).padStart(2, "0")}
      </span>

      <div className="relative z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-secondary sm:text-xs">
        <Clock className="size-3.5" style={{ color: accent }} />
        Release countdown
      </div>

      {done ? (
        <h2 className="relative z-10 my-auto text-4xl uppercase ">
          It&apos;s here!
        </h2>
      ) : (
        <div className="relative z-10 grid grid-cols-4 gap-3 py-7 sm:gap-5">
          <Unit value={timeLeft.days} label="Days" />
          <Unit value={timeLeft.hours} label="Hrs" />
          <Unit value={timeLeft.minutes} label="Min" />
          <Unit value={timeLeft.seconds} label="Sec" />
        </div>
      )}

      <p className="relative z-10 max-w-md text-xs leading-5 text-teritary sm:text-sm">
        {label}
      </p>
    </div>
  );
}
