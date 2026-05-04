"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getDefaultCoverUrl } from "@/lib/api";

type CoverArtProps = {
  src: string | string[] | null;
  alt: string;
  sizes: string;
  className?: string;
  fill?: boolean;
};

function sanitizeSources(src: string | string[] | null, fallbackSrc: string): string[] {
  const raw = Array.isArray(src) ? src : src ? [src] : [];
  const cleaned = raw
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  const withFallback = [...cleaned, fallbackSrc].filter((value, index, arr) => {
    return value.length > 0 && arr.indexOf(value) === index;
  });

  return withFallback.length > 0 ? withFallback : [fallbackSrc];
}

export function CoverArt({
  src,
  alt,
  sizes,
  className,
  fill = true,
}: CoverArtProps) {
  const fallbackSrc = getDefaultCoverUrl();
  const orderedCandidates = useMemo(() => {
    return sanitizeSources(src, fallbackSrc);
  }, [fallbackSrc, src]);
  const orderedCandidatesKey = orderedCandidates.join("||");

  const [imageState, setImageState] = useState<{
    srcIndex: number;
    sourceKey: string;
  }>({
    srcIndex: 0,
    sourceKey: orderedCandidatesKey,
  });
  const srcIndex =
    imageState.sourceKey === orderedCandidatesKey ? imageState.srcIndex : 0;
  const currentSrc = orderedCandidates[srcIndex] || fallbackSrc;

  const image = (
    <Image
      key={orderedCandidatesKey}
      src={currentSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => {
        setImageState((current) => {
          const effectiveIndex =
            current.sourceKey === orderedCandidatesKey ? current.srcIndex : 0;
          const nextIndex = effectiveIndex + 1;

          return {
            srcIndex:
              nextIndex < orderedCandidates.length ? nextIndex : effectiveIndex,
            sourceKey: orderedCandidatesKey,
          };
        });
      }}
    />
  );

  if (fill) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {image}
      </div>
    );
  }

  return image;
}
