// src/app/memorials/MemorialImage.tsx
"use client";

import { useState } from "react";

interface MemorialImageProps {
  src: string;
  alt: string;
}

export default function MemorialImage({ src, alt }: MemorialImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-48 object-cover"
      onError={() => {
        // This handler prevents broken image icons from appearing
        // by falling back to a placeholder if the original source fails.
        setImgSrc("https://placehold.co/600x400/eee/ccc?text=No+Image");
      }}
    />
  );
}
