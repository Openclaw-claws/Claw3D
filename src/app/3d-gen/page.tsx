import { ImageTo3DPanel } from "@/features/image-to-3d/components/ImageTo3DPanel";

export const metadata = { title: "Image to 3D — Claw3D" };

export default function ImageTo3DPage() {
  return (
    <div className="h-full w-full overflow-auto bg-background">
      <ImageTo3DPanel />
    </div>
  );
}
