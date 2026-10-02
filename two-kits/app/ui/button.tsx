import { variants } from "sluurp/cn";
import type { Props, Reactive } from "./types.ts";

/* ===================================================================
   Button
   =================================================================== */

export const buttonVariants = variants(
  `
    inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md text-sm
    font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,scale] duration-200 ease-out outline-none
    active:scale-[0.97] motion-reduce:active:scale-100
    focus-visible:border-ring focus-visible:ring-[3px]
    focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50
    aria-invalid:border-destructive aria-invalid:ring-destructive/20
    dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none
    [&_svg]:shrink-0 ` +
    // Sizes the icon only if the caller has not: `[class*='size-']` means
    // "already has a size utility", so passing `size-6` on an icon is not
    // quietly overridden by the component.
    "[&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          `
    bg-destructive text-white hover:bg-destructive/90
    focus-visible:ring-destructive/20 dark:bg-destructive/60
    dark:focus-visible:ring-destructive/40`,
        outline:
          `
    border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground
    dark:border-input dark:bg-input/30 dark:hover:bg-input/50`,
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // `has-[>svg]` tightens the padding when the button holds an icon
        // beside its text, so the icon does not make it look lopsided.
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonVariant =
  | "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

export type ButtonSize =
  | "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

export interface ButtonProps extends Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: Reactive<boolean>;
}

/**
 * A button.
 *
 *     <Button variant="outline" onClick={save}>Save</Button>
 *
 * `type="button"` by default, which is the opposite of the HTML default and
 * right far more often: a button inside a form that submits when you meant it
 * to open a menu is a bug nobody sees until the form is long.
 */
export function Button({
  children,
  variant,
  size,
  className,
  type = "button",
  disabled,
  ...rest
}: ButtonProps = {}) {
  return (
    <button
      data-size={size ?? "default"}
      class={buttonVariants({ variant, size, className })}
      type={type}
      disabled={disabled}
      {...rest}
    >{children}</button>
  );
}
