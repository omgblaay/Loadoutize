import { Toaster as Sonner, ToasterProps } from "sonner";

// This app has no light/dark toggle -- it's always dark (theme.css's `:root`
// carries the real values, `.dark` is never applied) -- so this is hardcoded
// dark and styled with the app's own hex tokens instead of pulling from
// next-themes (unused everywhere else) or the generic shadcn --popover/--border
// tokens, which read light-on-light here. Colors match dialog.tsx's panel
// (bg-[#121011] border-[#201e1f]) and the app's existing success/error hexes
// (#01a059 / destructive #d4183d).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "#121011",
          "--normal-border": "#201e1f",
          "--normal-text": "#fafafa",
          "--success-bg": "#0e1c15",
          "--success-border": "#01a059",
          "--success-text": "#5be8a8",
          "--error-bg": "#241214",
          "--error-border": "#d4183d",
          "--error-text": "#ef9696",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-lg",
          description: "text-[#8d898a]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
