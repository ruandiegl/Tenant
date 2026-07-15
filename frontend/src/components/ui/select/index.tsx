import "./styles.css";
import * as React from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "../../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn("shadcn-select-trigger", className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn("shadcn-select-content", className)} position={position} {...props}>
        <SelectPrimitive.ScrollUpButton className="shadcn-select-scroll-button">
          <ChevronUp aria-hidden="true" size={16} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="shadcn-select-viewport">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="shadcn-select-scroll-button">
          <ChevronDown aria-hidden="true" size={16} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn("shadcn-select-label", className)} {...props} />;
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn("shadcn-select-item", className)} {...props}>
      <span className="shadcn-select-item-indicator">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" size={15} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("shadcn-select-separator", className)} {...props} />;
}
