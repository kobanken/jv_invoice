import type { InputHTMLAttributes } from "react";

type InputAttributes = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "autoCapitalize" | "autoComplete" | "autoCorrect" | "inputMode" | "lang" | "pattern" | "spellCheck"
>;

export const numericInputAttributes = {
  inputMode: "numeric",
  pattern: "[0-9]*",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "none",
  spellCheck: false,
  lang: "en",
} satisfies InputAttributes;

export const alphaNumericInputAttributes = {
  inputMode: "text",
  pattern: "[A-Za-z0-9]*",
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "characters",
  spellCheck: false,
  lang: "en",
} satisfies InputAttributes;
