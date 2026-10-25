import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "destructive"; size?: "default" | "small" };
export function Button({ className, variant = "secondary", size = "default", ...props }: Props) {
  return <button className={cn("ui-button", `ui-button-${variant}`, size === "small" && "ui-button-small", className)} {...props} />;
}
