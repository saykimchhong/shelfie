import { Thumb } from "../Thumb/Thumb";

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} title={name}>
      <Thumb label={name} src={src ?? undefined} size={size} shape="circle" />
    </div>
  );
}
