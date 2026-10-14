"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import GlideSelect from "./GlideSelect";

// Preserve native form submission, validation and reset for existing profile forms.
export function ProfileSelect({
  children,
  value,
  defaultValue,
  onChange,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const native = useRef<HTMLSelectElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const options: { value: string; label: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ value?: string; children?: ReactNode }>(child)) {
      options.push({
        value: String(child.props.value ?? child.props.children ?? ""),
        label: child.props.children,
      });
    }
  });
  const initial = String(defaultValue ?? options[0]?.value ?? "");
  const [inner, setInner] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const current = value === undefined ? inner : String(value);
  useEffect(() => {
    const form = native.current?.form;
    const reset = () => {
      setInner(initial);
      setInvalid(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial]);
  return (
    <div ref={root} className="relative w-full">
      <select
        {...props}
        ref={native}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        value={current}
        onChange={onChange}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          root.current?.querySelector("button")?.focus();
          root.current
            ?.querySelector("button")
            ?.setAttribute("aria-invalid", "true");
        }}
      >
        {children}
      </select>
      <GlideSelect
        options={options}
        value={current}
        disabled={props.disabled}
        ariaLabel={props["aria-label"] ?? "Select an option"}
        size="lg"
        onChange={(next: string) => {
          setInner(next);
          setInvalid(false);
          root.current
            ?.querySelector("button")
            ?.removeAttribute("aria-invalid");
          if (native.current) {
            native.current.value = next;
            native.current.dispatchEvent(
              new Event("change", { bubbles: true }),
            );
          }
        }}
      />
      {invalid && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Please choose an option.
        </p>
      )}
    </div>
  );
}
