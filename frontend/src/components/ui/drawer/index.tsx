import "./styles.css";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes } from "react";
import { Dialog as DrawerPrimitive } from "radix-ui";
import { cn } from "../../../lib/utils";

export const Drawer = DrawerPrimitive.Root;
export const DrawerClose = DrawerPrimitive.Close;
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;

export const DrawerContent = forwardRef<
  ElementRef<typeof DrawerPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(function DrawerContent({ className, children, ...props }, ref) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="ui-drawer-overlay" />
      <DrawerPrimitive.Content className={cn("ui-drawer-content", className)} ref={ref} {...props}>
        <span aria-hidden="true" className="ui-drawer-handle" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
});

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn("ui-drawer-header", className)} {...props} />;
}

export function DrawerBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-drawer-body", className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer className={cn("ui-drawer-footer", className)} {...props} />;
}
