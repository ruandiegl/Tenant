import "./styles.css";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "../../../lib/utils";

type ToggleGroupProps = Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, "type">;

export function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return <ToggleGroupPrimitive.Root className={cn("ui-toggle-group", className)} type="single" {...props} />;
}

export function ToggleGroupItem({ className, ...props }: ToggleGroupPrimitive.ToggleGroupItemProps) {
  return <ToggleGroupPrimitive.Item className={cn("ui-toggle-group-item", className)} {...props} />;
}
