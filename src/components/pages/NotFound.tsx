import { useNavigate } from "react-router";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Loading } from "@/components/molecules/Loading";
import { Button } from "@/components/atoms/Button";

export function NotFound() {
  usePageTitle("Loadoutize • Page not found");
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0909] flex-col gap-6">
      <Loading label={null} size={140} />
      <div className="flex flex-col items-center gap-2 text-center px-6">
        <h1 className="text-2xl font-semibold text-[#efedf1]">Page not found</h1>
        <p className="text-[14px] text-[#8d898a] max-w-sm">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>
      <Button onClick={() => navigate("/home")} className="h-11 px-5 rounded-xl bg-[#fafafa] text-[#161414] font-medium">
        Back to Home
      </Button>
    </div>
  );
}
