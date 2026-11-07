const IMMEDIATE_PICKUP_SLOT = "รับทันที (เตรียมอาหาร 15-20 นาที)";

function extractTimeHHMM(isoOrTime?: string): string | null {
  if (!isoOrTime) return null;
  const match =
    isoOrTime.match(/T(\d{2}:\d{2})/) || isoOrTime.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, "0");
  const m = String(normalized % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function buildPickupTimeSlots(
  openTime?: string,
  closeTime?: string,
  fallbackSlots?: string[]
): string[] {
  const openHHMM = extractTimeHHMM(openTime);
  const closeHHMM = extractTimeHHMM(closeTime);
  const immediate =
    fallbackSlots?.find((s) => s.startsWith("รับทันที")) ||
    IMMEDIATE_PICKUP_SLOT;

  if (!openHHMM || !closeHHMM) {
    return fallbackSlots && fallbackSlots.length > 0
      ? fallbackSlots
      : [immediate];
  }

  const startMin = toMinutes(openHHMM);
  const endMin = toMinutes(closeHHMM);
  if (endMin <= startMin) {
    return [immediate];
  }

  const slots: string[] = [immediate];
  for (let cur = startMin; cur < endMin; cur += 30) {
    const nextStep = cur + 30;
    const slotEnd = nextStep >= endMin ? endMin : cur + 15;
    slots.push(`${formatMinutes(cur)} - ${formatMinutes(slotEnd)} น.`);
  }
  return slots;
}
