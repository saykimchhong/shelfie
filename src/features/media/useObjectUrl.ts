import { useEffect, useMemo } from "react";

// A preview URL for a Blob that's revoked when the blob changes or unmounts.
export function useObjectUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}
