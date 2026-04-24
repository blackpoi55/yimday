"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

type SearchableSelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function SearchableSelect({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder = "เลือกข้อมูล",
  searchPlaceholder = "พิมพ์เพื่อค้นหา",
  emptyText = "ไม่พบข้อมูล",
  disabled = false,
  required = false,
  className,
}: SearchableSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const currentValue = isControlled ? (value ?? "") : internalValue;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue) ?? null,
    [currentValue, options],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.keywords ?? ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateDropdownPosition = () => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      setDropdownStyle({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    };

    updateDropdownPosition();
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDropdownStyle(null);
    }
  }, [open]);

  function handleSelect(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <input name={name} type="hidden" value={currentValue} />
      <button
        aria-expanded={open}
        className={cn(
          "legacy-form-control flex items-center justify-between gap-3 text-left",
          !selectedOption && "text-muted-foreground",
          disabled && "cursor-not-allowed opacity-60",
        )}
        disabled={disabled}
        id={id}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        type="button"
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-[#64748b] transition", open && "rotate-180")} />
      </button>

      {required ? (
        <input
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
          onChange={() => undefined}
          required
          tabIndex={-1}
          value={currentValue}
        />
      ) : null}

      {open && dropdownStyle
        ? createPortal(
            <div
              className="fixed z-[100] overflow-hidden rounded-xl border border-[#d7e2ee] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              ref={dropdownRef}
              style={dropdownStyle}
            >
              <div className="border-b border-[#e2e8f0] p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    className="legacy-form-control pl-9"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setOpen(false);
                        setQuery("");
                      }

                      if (event.key === "Enter" && filteredOptions[0]) {
                        event.preventDefault();
                        handleSelect(filteredOptions[0].value);
                      }
                    }}
                    placeholder={searchPlaceholder}
                    ref={searchInputRef}
                    value={query}
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const isActive = option.value === currentValue;

                    return (
                      <button
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                          isActive
                            ? "bg-[#eef8f6] text-[#0f172a]"
                            : "text-[#334155] hover:bg-[#f8fbff]",
                        )}
                        key={option.value}
                        onClick={() => handleSelect(option.value)}
                        type="button"
                      >
                        <span className="truncate">{option.label}</span>
                        {isActive ? <Check className="size-4 shrink-0 text-[#0f766e]" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-sm text-[#64748b]">{emptyText}</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
