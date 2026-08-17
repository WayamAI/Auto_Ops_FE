import { useTheme } from "@/components/theme-provider";
import logoDarkSurface from "@/assets/wayam/wayam-logo-dark-surface.svg";
import logoLightSurface from "@/assets/wayam/wayam-logo-light-surface.svg";

/**
 * Renders the Wayam AI logo, picking the light text variant on dark surfaces
 * and the dark text variant on light surfaces so the wordmark always has
 * contrast against whatever background it sits on.
 */
export default function WayamLogo({ className, alt = "Wayam AI" }: { className?: string; alt?: string }) {
  const { theme } = useTheme();
  const effectiveTheme =
    theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

  const src = effectiveTheme === "dark" ? logoDarkSurface : logoLightSurface;

  return <img src={src} alt={alt} className={className} />;
}
