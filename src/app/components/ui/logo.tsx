import logoUrl from "figma:asset/logo.svg";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src={logoUrl} alt="Loadize Logo" className="h-[auto] w-48" />
    </div>
  );
}