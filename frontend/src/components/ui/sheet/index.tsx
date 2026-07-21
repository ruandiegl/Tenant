import "./styles.css";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes } from "react";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "../../../lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

type SheetContentProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};

export const SheetContent = forwardRef<ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(function SheetContent(
  { children, className, side = "right", showCloseButton = true, ...props },
  ref
) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="ui-sheet-overlay" />
      <SheetPrimitive.Content className={cn("ui-sheet-content", className)} data-side={side} ref={ref} {...props}>
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close aria-label="Fechar" className="ui-sheet-close">
            <X aria-hidden="true" />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
});

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn("ui-sheet-header", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer className={cn("ui-sheet-footer", className)} {...props} />;
}
