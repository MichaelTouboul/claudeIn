/**
 * djb2 string hash → unsigned 32-bit decimal string. Fast and stable, used as a
 * content-derived dedup hint for panel tab ids. NOT collision-proof: callers must
 * verify true content equality before treating two equal hashes as the same item.
 */
export function contentHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
