import PixelErrorScreen from "@/components/pixel/PixelErrorScreen";

export default function NotFound() {
  return (
    <PixelErrorScreen
      title="This shelf is empty"
      message="We couldn't find that page. It may have moved, or it never existed."
      home={{ href: "/", label: "Back to the haven" }}
    />
  );
}
