/**
 * SplitText utility
 * Splits a string into individual <span> elements for GSAP char animation.
 */

import type { ReactElement } from "react";

export function splitToChars(text: string, className = "char"): ReactElement[] {
  return text.split("").map((char, i) => (
    <span
      key={i}
      className={`${className} inline-block`}
      aria-hidden={char === " " ? true : undefined}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

interface SplitTextProps {
  text: string;
  className?: string;
  charClassName?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function SplitText({
  text,
  className = "",
  charClassName = "char",
  as: Tag = "span",
}: SplitTextProps) {
  return (
    <Tag className={`inline overflow-hidden ${className}`}>
      {splitToChars(text, charClassName)}
    </Tag>
  );
}
