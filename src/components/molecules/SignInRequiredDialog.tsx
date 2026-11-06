import { useNavigate } from "react-router";
import { Button } from "@/components/atoms/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/Dialog";
import { LoadoutWall } from "@/components/organisms/LoadoutWall";
import { SHOWCASE_SLIDES } from "@/lib/showcaseSlides";

export function SignInRequiredDialog({
  open,
  onOpenChange,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 gap-0 overflow-hidden sm:max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <DialogHeader>
              <DialogTitle>Sign in required</DialogTitle>
              <DialogDescription>
                <ul className="flex flex-col gap-2 mt-4 text-[14px] text-secondary">
                  <li>Like, dislike, and favorite the community's loadouts</li>
                  <li>Build and publish your own weapon setups</li>
                  <li>Share your builds with a link or QR code</li>
                </ul>{" "}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-auto">
              <Button
                className="w-full"
                onClick={() => navigate("/join", { state: { from: returnTo } })}
              >
                Join for free
              </Button>
            </DialogFooter>
          </div>
          <div className="relative hidden sm:block min-h-[280px] bg-[#0a0909] overflow-hidden">
            <LoadoutWall />
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <h3 className="text-xl font-bold mb-1">{SHOWCASE_SLIDES[2].title}</h3>
              <p className="text-neutral-400 text-sm">{SHOWCASE_SLIDES[2].body}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
