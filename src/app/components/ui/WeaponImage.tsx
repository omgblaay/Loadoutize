export function WeaponImage({ imageUrl, variant }: {  imageUrl?: string | null; variant?: "small" | "large" }) {
    const getVariantClasses = () => {
        switch (variant) {
            case "small":
                return "w-[14rem] aspect-[2/1] rounded-xl flex items-center justify-center shrink-0 overflow-hidden";
            case "large":
                return "w-full aspect-[2/1] rounded-xl flex items-center justify-center shrink-0 overflow-hidden";
            default:
                return "w-full aspect-[2/1] rounded-xl flex items-center justify-center shrink-0 overflow-hidden";
        }
    };

  return (
    <div
      className={getVariantClasses()}
    >
        <img src={imageUrl ?? undefined} alt="" className="w-full h-full object-contain p-2" />
    </div>
  );    
}