import Image from "next/image";

type BrandLogoVariant = "full" | "wordmark" | "icon" | "appIcon";

type BrandLogoProps = {
  variant: BrandLogoVariant;
  className?: string;
  alt?: string;
  priority?: boolean;
};

const BRAND_LOGOS: Record<
  BrandLogoVariant,
  { src: string; width: number; height: number; alt: string }
> = {
  full: {
    src: "/brand/flowsoundz-radio-full-transparent.png",
    width: 1600,
    height: 514,
    alt: "FlowSoundz Radio logo",
  },
  wordmark: {
    src: "/brand/flowsoundz-radio-wordmark-transparent.png",
    width: 1600,
    height: 258,
    alt: "FlowSoundz Radio wordmark",
  },
  icon: {
    src: "/brand/flowsoundz-fr-icon-transparent.png",
    width: 512,
    height: 512,
    alt: "FlowSoundz FR icon",
  },
  appIcon: {
    src: "/brand/flowsoundz-fr-appicon-dark.png",
    width: 1024,
    height: 1024,
    alt: "FlowSoundz app icon",
  },
};

export function BrandLogo({
  variant,
  className,
  alt,
  priority = false,
}: BrandLogoProps) {
  const asset = BRAND_LOGOS[variant];

  return (
    <Image
      src={asset.src}
      alt={alt ?? asset.alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={className}
    />
  );
}
