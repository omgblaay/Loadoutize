export function WeaponImage({ imageUrl, variant }: {  imageUrl?: string | null; variant?: "small" | "large" }) {
    const getVariantClasses = () => {
        switch (variant) {
            case "small":
                return "max-w-[14rem]";
            case "large":
                return "max-w-[32rem]";
            default:
                return "max-w-[22rem]";
        }
    };

  return (
    <div
      className={getVariantClasses()}>
        <img src={imageUrl ?? undefined} alt="" className="flex aspect-[2/1] w-full items-center justify-center object-fit" />
    </div>
  );    
}