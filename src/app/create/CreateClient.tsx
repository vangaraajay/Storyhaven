"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/pixel/Avatar";
import PixelButton from "@/components/pixel/PixelButton";
import PixelFrame from "@/components/pixel/PixelFrame";
import { PixelRadioGrid, PixelSwatchRow } from "@/components/pixel/PixelRadioGrid";
import PixelTabs from "@/components/pixel/PixelTabs";
import Toast from "@/components/pixel/Toast";
import { PART_OPTIONS, SWATCHES, randomAvatar, type PartName } from "@/lib/avatar/options";
import type { Avatar as AvatarData } from "@/lib/avatar/types";
import { saveAvatarAction } from "./actions";
import styles from "./create.module.css";

type ColorTarget = "skin" | "hairColor" | "topColor";

type Action =
  | { type: "setPart"; part: PartName; value: string }
  | { type: "setColor"; target: ColorTarget; value: string }
  | { type: "randomize" };

function reducer(state: AvatarData, action: Action): AvatarData {
  switch (action.type) {
    case "setPart":
      return {
        ...state,
        [action.part]: action.part === "accessory" && action.value === "none" ? null : action.value,
      } as AvatarData;
    case "setColor":
      return { ...state, [action.target]: action.value } as AvatarData;
    case "randomize":
      return randomAvatar();
  }
}

type TabId = "skin" | "hair" | "eyes" | "mouth" | "top" | "accessory";
const TABS: { id: TabId; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "eyes", label: "Eyes" },
  { id: "mouth", label: "Mouth" },
  { id: "top", label: "Top" },
  { id: "accessory", label: "Accessory" },
];

const FULL_BODY: TabId[] = ["top", "skin"];

export default function CreateClient({
  initial,
  hasSaved,
  returnTo,
}: {
  initial: AvatarData;
  hasSaved: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [avatar, dispatch] = useReducer(reducer, initial);
  const [tab, setTab] = useState<TabId>("skin");
  const [saved, setSaved] = useState<AvatarData | null>(hasSaved ? initial : null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [pending, startTransition] = useTransition();
  const leaving = useRef(false);
  // Preview and thumbnail scales follow the viewport so the editor fits on any screen.
  const [view, setView] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const update = () => setView({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const stacked = view.w < 768;
  // The 32px character should use about half the stage height (side by side) or 40% (stacked).
  const previewScale = Math.max(4, Math.min(8, Math.floor((view.h * (stacked ? 0.4 : 0.5)) / 32))) as 4;
  const thumbScale = (view.w >= 1100 ? 3 : 2) as 2;
  const columns = view.w >= 1400 ? 6 : view.w >= 1100 ? 5 : stacked ? 3 : 4;

  // Unsaved when nothing is stored yet (random start) or the choice differs from what is stored.
  const dirty = !saved || JSON.stringify(saved) !== JSON.stringify(avatar);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function goBack() {
    if (dirty && !window.confirm("Leave without saving your character?")) return;
    leaving.current = true;
    router.push(returnTo);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveAvatarAction(JSON.stringify(avatar));
      if (result.error) {
        setError(result.error);
        return;
      }
      leaving.current = true;
      setSaved(avatar);
      setToast(true);
      setTimeout(() => router.push(returnTo), 700);
    });
  }

  /** Current character with one option swapped. */
  function withPart(part: PartName, value: string): AvatarData {
    return reducer(avatar, { type: "setPart", part, value });
  }

  const part: PartName | null = tab === "skin" ? null : tab;

  return (
    <main className={styles.page} data-motion="full">
      <header className={styles.header}>
        <PixelButton onClick={goBack} aria-label="Back">
          ← Back
        </PixelButton>
        <h1 className={styles.title}>Edit character</h1>
      </header>

      <div className={styles.layout}>
        <PixelFrame className={styles.left}>
          <div className={styles.stage}>
            <Avatar avatar={avatar} scale={previewScale} blink label="Your character" />
            <div className={styles.floor} aria-hidden />
          </div>
          <div className={styles.buttons}>
            <PixelButton onClick={() => dispatch({ type: "randomize" })}>Randomize</PixelButton>
            <PixelButton onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </PixelButton>
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </PixelFrame>

        <PixelFrame className={styles.right}>
          <PixelTabs tabs={TABS} value={tab} onChange={setTab} aria-label="Character parts" />

          {tab === "skin" ? (
            <PixelRadioGrid
              label="Skin"
              columns={columns}
              items={SWATCHES.skin}
              value={avatar.skin}
              onChange={(v) => dispatch({ type: "setColor", target: "skin", value: v })}
              renderCell={(item) => (
                <Avatar
                  avatar={{ ...avatar, skin: item.id as AvatarData["skin"] }}
                  scale={thumbScale}
                  crop={FULL_BODY.includes(tab) ? "full" : "head"}
                />
              )}
            />
          ) : part ? (
            <PixelRadioGrid
              label={TABS.find((t) => t.id === tab)!.label}
              columns={columns}
              items={PART_OPTIONS[part]}
              value={String(avatar[part] ?? "none")}
              onChange={(v) => dispatch({ type: "setPart", part, value: v })}
              renderCell={(item) => (
                <Avatar
                  avatar={withPart(part, item.id)}
                  scale={thumbScale}
                  crop={FULL_BODY.includes(tab) ? "full" : "head"}
                />
              )}
            />
          ) : null}

          {tab === "hair" ? (
            <PixelSwatchRow
              label="Hair color"
              items={SWATCHES.hair}
              value={avatar.hairColor}
              onChange={(v) => dispatch({ type: "setColor", target: "hairColor", value: v })}
            />
          ) : null}
          {tab === "top" ? (
            <PixelSwatchRow
              label="Top color"
              items={SWATCHES.top}
              value={avatar.topColor}
              onChange={(v) => dispatch({ type: "setColor", target: "topColor", value: v })}
            />
          ) : null}
        </PixelFrame>
      </div>

      {toast ? (
        <div className={styles.toastHost}>
          <Toast>Character saved</Toast>
        </div>
      ) : null}
    </main>
  );
}
