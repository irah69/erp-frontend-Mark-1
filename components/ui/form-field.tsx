import type { ReactNode } from "react";

export function FormField({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <span className="form-field-hint">{hint}</span>}
      {error && <span className="form-field-error" role="alert">{error}</span>}
    </label>
  );
}
