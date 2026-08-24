/**
 * Panel sekmeleri.
 *
 * Bileşen dosyasından ayrı duruyor: `react-refresh/only-export-components`
 * kuralı, bileşen dosyalarının yanında sabit dışa aktarmasına izin vermiyor —
 * karışık dosyalarda hızlı yenileme sessizce bozuluyor.
 */
export type PlatformTab = "organizations" | "operators" | "audit";

export const PLATFORM_TABS: { id: PlatformTab; label: string }[] = [
  { id: "organizations", label: "Kurumlar" },
  { id: "operators", label: "Operatörler" },
  { id: "audit", label: "Denetim Kaydı" },
];
