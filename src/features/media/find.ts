import { MAX_SHOT_FRAME_BYTES, shotPicksSchema, type ShotPick, type ShotProduct } from "@/domain/photos";
import { clientAuth } from "@/lib/firebase/client";
import { shotRequests, shotTimes, type ShotTarget } from "./shots";
import { captureStills, type FrameRequest } from "./video";

// Crop requests from the Photo finder; any failure falls back to the Watcher's frame.
export async function pickShots(url: string, targets: readonly ShotTarget[]): Promise<FrameRequest[]> {
  const fallback = () => shotRequests(targets, [], []);
  try {
    const idToken = await clientAuth().currentUser?.getIdToken();
    if (!idToken || targets.length === 0) return fallback();

    const times = targets.map((target) => shotTimes(target.seconds));
    const stills = await captureStills(url, times.flat());
    let next = 0;
    const sent = times.map((moments) =>
      moments.flatMap((time) => {
        const still = stills[next++];
        return still && still.size <= MAX_SHOT_FRAME_BYTES ? [{ time, still }] : [];
      }),
    );
    const asked = targets.flatMap((target, index) => (sent[index].length > 0 && target.name.trim() ? [index] : []));
    if (asked.length === 0) return fallback();

    const products: ShotProduct[] = asked.map((index) => ({
      name: targets[index].name.trim().slice(0, 120),
      localName: targets[index].localName?.trim().slice(0, 120) || null,
      hint: targets[index].box,
      frames: sent[index].length,
    }));
    const body = new FormData();
    body.append("products", JSON.stringify(products));
    for (const index of asked) for (const { still } of sent[index]) body.append("frame", still);

    const response = await fetch("/api/photos/find", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body,
    });
    if (!response.ok) return fallback();
    const { picks } = shotPicksSchema.parse(await response.json());

    const pickFor: (ShotPick | null)[] = targets.map(() => null);
    asked.forEach((index, order) => (pickFor[index] = picks[order] ?? null));
    return shotRequests(
      targets,
      sent.map((frames) => frames.map(({ time }) => time)),
      pickFor,
    );
  } catch (error) {
    console.warn("Photo finder fell back to the Watcher's frames", error);
    return fallback();
  }
}
