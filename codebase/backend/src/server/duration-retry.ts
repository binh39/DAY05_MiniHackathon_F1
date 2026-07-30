/** Returns true for duration failures raised before or after TTS generation. */
export function isDurationFailure(error?: string): boolean {
  if (!error) return false;
  const normalized = error.toLocaleLowerCase("vi");
  return (
    normalized.includes("duration_out_of_range") ||
    normalized.includes("duration plan") ||
    normalized.includes("duration budget")
  );
}
