export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <img src="src/assets/logo.png" alt="Ldtize Logo" className="h-10" />
    </div>
  );
}