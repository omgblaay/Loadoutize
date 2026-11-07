import { useEffect, useRef } from "react";

const VIDEO = "/weapon-preview/weapon-builder/white-smoke-green-keyed.webm";
const POSTER = "/weapon-preview/weapon-builder/white-smoke-green-keyed.webp";
const edgeGradients = [
  "linear-gradient(to bottom, #0a0909 0%, transparent 20%, transparent 80%, #0a0909 100%)",
  "linear-gradient(to right, #0a0909 0%, transparent 20%, transparent 80%, #0a0909 100%)",
];

export function WeaponPreviewSmoke() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = true;
    const syncPlayback = () => {
      if (reducedMotion.matches || document.hidden || !inView) video.pause();
      else void video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(video);
    reducedMotion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <video
        ref={videoRef}
        src={VIDEO}
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-fill opacity-[0.09] motion-reduce:hidden"
      />
      <img
        src={POSTER}
        alt=""
        className="absolute inset-0 hidden size-full object-fill opacity-[0.09] motion-reduce:block"
      />
      {edgeGradients.map((background, index) => (
        <div
          key={index}
          className="absolute inset-0"
          style={{ background }}
        />
      ))}
    </div>
  );
}
