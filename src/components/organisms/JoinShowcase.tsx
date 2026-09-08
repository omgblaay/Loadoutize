import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/molecules/Carousel";
import { LoadoutWall } from "@/components/organisms/LoadoutWall";
import { SHOWCASE_SLIDES } from "@/lib/showcaseSlides";
import { cn } from "@/lib/utils";

export function JoinShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [api]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0909]">
      <LoadoutWall />

      <div className="relative h-full flex flex-col justify-end p-12 xl:p-16">
        <Carousel setApi={setApi} opts={{ loop: true }} className="w-full max-w-lg">
          <CarouselContent>
            {SHOWCASE_SLIDES.map((slide) => (
              <CarouselItem key={slide.title}>
                <h2 className="text-3xl font-bold text-[#fafafa] mb-3">{slide.title}</h2>
                <p className="text-neutral-400 text-base leading-relaxed">{slide.body}</p>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="flex items-center gap-2 mt-8">
          {SHOWCASE_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-8 bg-[#fafafa]" : "w-1.5 bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

