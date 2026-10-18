"use client";

import Badge from "@/components/pixel/Badge";
import PixelButton from "@/components/pixel/PixelButton";
import PixelDivider from "@/components/pixel/PixelDivider";
import PixelFrame from "@/components/pixel/PixelFrame";
import PixelInput, {
  PixelSelect,
  PixelTextarea,
} from "@/components/pixel/PixelInput";
import Avatar from "@/components/pixel/Avatar";
import AvatarCreator from "@/components/pixel/AvatarCreator";
import Icon from "@/components/pixel/Icon";
import StarRating from "@/components/pixel/StarRating";
import Toast from "@/components/pixel/Toast";
import { ICONS, SPRITES, type IconName } from "@/lib/sprites";
import TabsDemo from "./TabsDemo";

const noop = () => {};

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>{title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        {children}
      </div>
    </section>
  );
}

/** Client body: demos pass event handlers. */
export default function KitBody() {

  const missing = Object.entries(SPRITES)
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  return (
    <main
      style={{
        padding: "1.5rem",
        background: "#191724",
        color: "#e0def4",
        minHeight: "100dvh",
      }}
    >
      <h1 style={{ marginBottom: "0.25rem" }}>Pixel kit</h1>
      <p style={{ marginBottom: "1.5rem", color: "#908caa" }}>
        Sprites at {2}x. Missing sprites (using fallback): {missing.join(", ") || "none"}.
      </p>

      <Row title="PixelButton: default / hover (real) / pressed (forced) / disabled">
        <PixelButton>Default</PixelButton>
        <PixelButton>Hover me</PixelButton>
        <PixelButton pressed>Pressed</PixelButton>
        <PixelButton disabled>Disabled</PixelButton>
      </Row>

      <Row title="PixelInput / PixelTextarea / PixelSelect: default / focus (forced) / disabled">
        <PixelInput placeholder="Default" />
        <PixelInput placeholder="Focused" forceFocus />
        <PixelInput placeholder="Disabled" disabled />
        <PixelSelect defaultValue="b">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </PixelSelect>
        <PixelTextarea placeholder="Textarea" rows={2} />
      </Row>

      <Row title="PixelTabs: click to switch (inactive / active)">
        <TabsDemo />
      </Row>

      <Row title="Badge: static / clickable">
        <Badge>Book</Badge>
        <Badge>Piranesi</Badge>
        <Badge onClick={noop}>Clickable</Badge>
      </Row>

      <Row title="Toast: status / alert / dismissible">
        <Toast>Saved your log.</Toast>
        <Toast role="alert">Failed to post comment.</Toast>
        <Toast onClose={noop}>Unlocked: Cozy Candle!</Toast>
      </Row>

      <Row title="PixelFrame">
        <PixelFrame style={{ width: 240 }}>
          <p>Short text in a frame.</p>
        </PixelFrame>
        <PixelFrame as="article" style={{ width: 240, minHeight: 120 }}>
          <strong>Taller frame</strong>
          <PixelDivider />
          <p>Divider above (fallback line until art exists).</p>
        </PixelFrame>
      </Row>

      <Row title="Icon: size 1 (16px) / size 2 (32px) / flipped / labelled">
        {(Object.keys(ICONS) as IconName[]).map((name) => (
          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name={name} size={1} />
            <Icon name={name} />
          </span>
        ))}
        <Icon name="upvote" size={1} className="px-flip-y" />
        <Icon name="heart" label="Liked" />
      </Row>

      <Row title="StarRating: empty / 3 / disabled (arrows, Home/End, Backspace clears)">
        <StarRating aria-label="Empty" />
        <StarRating defaultValue={3} aria-label="Three" />
        <StarRating defaultValue={4} disabled aria-label="Disabled" />
      </Row>

      <div data-motion="full">
        <Row title="Avatar: scale 1-4 / head crop / walk frame / blinking (data-motion=full)">
          <Avatar scale={1} />
          <Avatar scale={2} />
          <Avatar scale={4} blink />
          <Avatar scale={2} crop="head" avatar={{ v: 1, skin: "ebony", eyes: "happy", mouth: "flat", top: "hoodie", topColor: "rose", hair: "curly_pigtails", hairColor: "iris", accessory: "headphones" }} />
          <Avatar scale={2} body="walk_l" />
        </Row>
        <Row title="AvatarCreator">
          <AvatarCreator />
        </Row>
      </div>

      <Row title="PixelDivider">
        <div style={{ width: 320 }}>
          <PixelDivider />
        </div>
      </Row>
    </main>
  );
}
