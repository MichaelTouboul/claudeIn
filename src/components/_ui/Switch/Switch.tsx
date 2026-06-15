import * as RadixSwitch from "@radix-ui/react-switch";
import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<ComponentProps<typeof RadixSwitch.Root>, "children"> & {
  /**
   * Visible text label rendered next to the control and wired to it for an
   * accessible name. When omitted you MUST pass an `aria-label` on the root.
   */
  label?: ReactNode;
};

/**
 * Token-driven on/off toggle. Wraps Radix Switch (keyboard-operable, exposes
 * `role="switch"` + `aria-checked`) and adds a focus ring, the accent fill when
 * on, and an optional inline label that doubles as the accessible name. Generic,
 * no domain knowledge.
 */
export function Switch({ label, className, id, disabled, ...props }: SwitchProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <span className="inline-flex items-center gap-2.5">
      <RadixSwitch.Root
        id={controlId}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
          "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
          "border-border-strong bg-[var(--color-surface-inset)]",
          "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          "data-[state=checked]:border-[var(--color-accent-solid)] data-[state=checked]:bg-[var(--color-accent-solid)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <RadixSwitch.Thumb
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
            "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
            "data-[state=checked]:translate-x-[15px]",
          )}
        />
      </RadixSwitch.Root>
      {label !== undefined ? (
        <label
          htmlFor={controlId}
          className={cn("text-sm select-none", disabled ? "cursor-not-allowed" : "cursor-pointer")}
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </label>
      ) : null}
    </span>
  );
}
