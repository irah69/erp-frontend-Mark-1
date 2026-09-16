"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export interface SliderImage {
  src: string;
  title?: string;
  caption?: string;
}

interface ImageSliderProps extends React.HTMLAttributes<HTMLDivElement> {
  images: SliderImage[];
  interval?: number;
}

export function ImageSlider({
  images,
  interval = 5000,
  className = "",
  ...props
}: ImageSliderProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (paused || images.length < 2) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval, paused]);

  const active = images[index];

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      {...props}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={index}
          src={active.src}
          alt={active.title ?? `Slide ${index + 1}`}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: reduceMotion ? 0 : 0.9, ease: "easeInOut" },
            scale: { duration: reduceMotion ? 0 : 7, ease: "linear" },
          }}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </AnimatePresence>

      {/* Legibility wash for the caption and dots */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

      {(active.title || active.caption) && (
        <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {active.title && (
                <h2 className="max-w-sm text-2xl font-semibold leading-snug text-white lg:text-3xl">
                  {active.title}
                </h2>
              )}
              {active.caption && (
                <p className="mt-2 max-w-sm text-sm text-slate-300">
                  {active.caption}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex gap-2">
            {images.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  i === index
                    ? "w-8 bg-white"
                    : "w-4 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageSlider;