type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <img
      alt="podePedir"
      className={`brand-logo ${compact ? "brand-logo-compact" : ""} ${className}`.trim()}
      src={compact ? "/podepedir-icon.svg" : "/podepedir-logo.svg"}
    />
  );
}
