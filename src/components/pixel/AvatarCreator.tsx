"use client";

import { useState } from "react";
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  HAIR_PALETTES,
  SKIN_PALETTES,
  TOP_PALETTES,
  type Avatar as AvatarData,
  type Palette,
} from "@/lib/avatar/types";
import Avatar from "./Avatar";
import PixelButton from "./PixelButton";
import PixelFrame from "./PixelFrame";
import styles from "./AvatarCreator.module.css";

export type AvatarCreatorProps = {
  /** When set, a hidden input with this name submits the avatar JSON. */
  name?: string;
  defaultValue?: AvatarData | null;
  onChange?: (avatar: AvatarData) => void;
};

function label(id: string): string {
  return id.replace(/_/g, " ").replace(/^3d/, "3D");
}

function Swatches({
  legend,
  options,
  palettes,
  value,
  onPick,
}: {
  legend: string;
  options: readonly string[];
  palettes: Record<string, Palette>;
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.options} role="radiogroup" aria-label={legend}>
        {options.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            aria-label={label(id)}
            title={label(id)}
            className={styles.swatch}
            style={{ background: palettes[id][1] }}
            onClick={() => onPick(id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Choices<T extends string>({
  legend,
  options,
  value,
  onPick,
  allowNone,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  onPick: (id: T | null) => void;
  allowNone?: boolean;
}) {
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.options} role="radiogroup" aria-label={legend}>
        {allowNone ? (
          <PixelButton role="radio" aria-checked={value === null} pressed={value === null} onClick={() => onPick(null)}>
            None
          </PixelButton>
        ) : null}
        {options.map((id) => (
          <PixelButton
            key={id}
            role="radio"
            aria-checked={value === id}
            pressed={value === id}
            onClick={() => onPick(id)}
          >
            {label(id)}
          </PixelButton>
        ))}
      </div>
    </fieldset>
  );
}

/** Character creator: live preview + option pickers. Emits the avatar JSON. */
export default function AvatarCreator({ name, defaultValue, onChange }: AvatarCreatorProps) {
  const [avatar, setAvatar] = useState<AvatarData>(defaultValue ?? DEFAULT_AVATAR);

  function set<K extends keyof AvatarData>(key: K, value: AvatarData[K]) {
    const next = { ...avatar, [key]: value };
    setAvatar(next);
    onChange?.(next);
  }

  return (
    <div className={styles.root}>
      {name ? <input type="hidden" name={name} value={JSON.stringify(avatar)} /> : null}

      <div className={styles.preview}>
        <PixelFrame>
          <Avatar avatar={avatar} scale={4} blink label="Your character" />
        </PixelFrame>
        <PixelButton onClick={() => { setAvatar(DEFAULT_AVATAR); onChange?.(DEFAULT_AVATAR); }}>
          Reset
        </PixelButton>
      </div>

      <div className={styles.controls}>
        <Choices legend="Hair" options={AVATAR_OPTIONS.hair} value={avatar.hair} onPick={(v) => v && set("hair", v)} />
        <Swatches legend="Hair color" options={AVATAR_OPTIONS.hairColor} palettes={HAIR_PALETTES} value={avatar.hairColor} onPick={(v) => set("hairColor", v as AvatarData["hairColor"])} />
        <Swatches legend="Skin" options={AVATAR_OPTIONS.skin} palettes={SKIN_PALETTES} value={avatar.skin} onPick={(v) => set("skin", v as AvatarData["skin"])} />
        <Choices legend="Eyes" options={AVATAR_OPTIONS.eyes} value={avatar.eyes} onPick={(v) => v && set("eyes", v)} />
        <Choices legend="Mouth" options={AVATAR_OPTIONS.mouth} value={avatar.mouth} onPick={(v) => v && set("mouth", v)} />
        <Choices legend="Top" options={AVATAR_OPTIONS.top} value={avatar.top} onPick={(v) => v && set("top", v)} />
        <Swatches legend="Top color" options={AVATAR_OPTIONS.topColor} palettes={TOP_PALETTES} value={avatar.topColor} onPick={(v) => set("topColor", v as AvatarData["topColor"])} />
        <Choices legend="Accessory" options={AVATAR_OPTIONS.accessory} value={avatar.accessory} onPick={(v) => set("accessory", v)} allowNone />
      </div>
    </div>
  );
}
