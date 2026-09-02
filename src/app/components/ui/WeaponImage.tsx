export function WeaponImage({ imageUrl, variant, alt = "" }: {  imageUrl?: string | null; variant?: "small" | "large"; alt?: string }) {
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
        <img src={imageUrl ?? undefined} alt={alt} className="flex aspect-[2/1] w-full items-center justify-center object-fit" />
    </div>
  );    
}