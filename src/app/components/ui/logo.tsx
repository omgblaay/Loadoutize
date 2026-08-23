import logoUrl from "figma:asset/loadize.svg";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src={logoUrl} alt="Loadize Logo" className="h-10 w-28" />
    </div>
  );
}