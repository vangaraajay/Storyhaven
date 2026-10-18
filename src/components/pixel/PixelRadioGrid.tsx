"use client";

import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import styles from "./PixelRadioGrid.module.css";

type Item = { id: string; name: string };

function useRoving(count: number, columns: number, onMove: (index: number) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(e: KeyboardEvent, index: number) {
    let next = index;
    switch (e.key) {
      case "ArrowRight": next = index + 1; break;
      case "ArrowLeft": next = index - 1; break;
      case "ArrowDown": next = index + columns; break;
      case "ArrowUp": next = index - columns; break;
      case "Home": next = 0; break;
      case "End": next = count - 1; break;
      default: return;
    }
    e.preventDefault();
    if (next < 0 || next >= count) return;
    refs.current[next]?.focus();
    onMove(next);
  }
  return { refs, onKeyDown };
}

export type PixelRadioGridProps = {
  label: string;
  items: Item[];
  value: string;
  onChange: (id: string) => void;
  /** Cell art (e.g. an <Avatar> thumbnail). */
  renderCell: (item: Item) => ReactNode;
  columns?: number;
  /** Show the text under each cell (default true). aria-label always keeps the name. */
  showNames?: boolean;
};

/** Radio group laid out as a grid; arrows move + select, Home/End jump. */
export function PixelRadioGrid({
  label,
  items,
  value,
  onChange,
  renderCell,
  columns = 4,
  showNames = true,
}: PixelRadioGridProps) {
  const { refs, onKeyDown } = useRoving(items.length, columns, (i) => onChange(items[i].id));
  const current = Math.max(0, items.findIndex((i) => i.id === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.grid}
      style={{ "--cols": columns } as CSSProperties}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={item.id === value}
          aria-label={item.name}
          tabIndex={i === current ? 0 : -1}
          className={styles.item}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          <span className={styles.cell}>{renderCell(item)}</span>
          {showNames ? <span>{item.name}</span> : null}
        </button>
      ))}
    </div>
  );
}

export type SwatchItem = { id: string; name: string; palette: readonly string[] };

/** Row of colour swatches (shows each palette's mid tone), same keyboard model. */
export function PixelSwatchRow({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: SwatchItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { refs, onKeyDown } = useRoving(items.length, items.length, (i) => onChange(items[i].id));
  const current = Math.max(0, items.findIndex((i) => i.id === value));
  return (
    <div role="radiogroup" aria-label={label} className={styles.swatches}>
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={item.id === value}
          aria-label={item.name}
          title={item.name}
          tabIndex={i === current ? 0 : -1}
          className={styles.swatch}
          style={{ background: item.palette[1] }}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        />
      ))}
    </div>
  );
}
