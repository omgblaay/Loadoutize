import logoUrl from "@/assets/logo.svg";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src={logoUrl} alt="Loadoutize" className="h-auto w-48" />
    </div>
  );
}
