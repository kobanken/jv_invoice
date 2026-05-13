"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CustomerSearchOption<T extends string | number = string | number> = {
  value: T;
  label: string;
  keywords?: string;
};

type Props<T extends string | number> = {
  label: string;
  value: T;
  options: CustomerSearchOption<T>[];
  onChange: (value: T) => void;
  emptyOption?: CustomerSearchOption<T>;
  placeholder?: string;
  className?: string;
};

export function CustomerSearchField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  emptyOption,
  placeholder = "顧客コード・顧客名で検索",
  className = "",
}: Props<T>) {
  const allOptions = useMemo(() => {
    return emptyOption ? [emptyOption, ...options] : options;
  }, [emptyOption, options]);
  const selectedOption = allOptions.find((option) => option.value === value);
  const selectedLabel = emptyOption && value === emptyOption.value ? "" : selectedOption?.label ?? "";
  const [query, setQuery] = useState(selectedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedLabel);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [selectedLabel]);

  const matchedOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    return normalizedQuery
      ? allOptions.filter((option) => {
          const text = normalizeSearchText(`${option.label} ${option.keywords ?? ""} ${option.value}`);
          return text.includes(normalizedQuery);
        })
      : allOptions;
  }, [allOptions, query]);
  const filteredOptions = matchedOptions.slice(0, 50);

  function selectOption(option: CustomerSearchOption<T>) {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  }

  return (
    <label ref={wrapperRef} className={`relative block text-sm font-semibold ${className}`}>
      {label}
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="field mt-1 w-full font-normal"
        autoComplete="off"
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm font-normal shadow-lg">
          {filteredOptions.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${
                option.value === value ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-700"
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-slate-500">該当する顧客がありません。</div>
          ) : null}
          {matchedOptions.length > filteredOptions.length ? (
            <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              {matchedOptions.length}件中50件まで表示しています。入力して絞り込んでください。
            </div>
          ) : null}
        </div>
      ) : null}
    </label>
  );
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}
