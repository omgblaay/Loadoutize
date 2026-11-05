
import {
  Search,
} from "lucide-react";
import { Input } from "@/components/atoms/Input";

export function SearchBar({
  isExplore,
  value,
  onChange,
  className,
}: {
  isExplore: boolean;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return !isExplore ? (
    <Input
      placeholder="Search loadouts, creators, weapons, or links..."
      icon={<Search className="w-5 h-5 text-[#8d898a]" />}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
    />
  ) : null;
}

