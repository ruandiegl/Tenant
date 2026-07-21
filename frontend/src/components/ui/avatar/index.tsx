import "./styles.css";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "../../../lib/utils";

export function Avatar({ className, ...props }: AvatarPrimitive.AvatarProps) {
  return <AvatarPrimitive.Root className={cn("ui-avatar", className)} {...props} />;
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.AvatarImageProps) {
  return <AvatarPrimitive.Image className={cn("ui-avatar-image", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.AvatarFallbackProps) {
  return <AvatarPrimitive.Fallback className={cn("ui-avatar-fallback", className)} {...props} />;
}
