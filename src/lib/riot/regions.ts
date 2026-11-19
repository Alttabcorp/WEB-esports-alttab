export type PlatformRegion =
  | "br1"
  | "na1"
  | "euw1"
  | "eun1"
  | "kr"
  | "jp1"
  | "la1"
  | "la2"
  | "oc1"
  | "tr1"
  | "ru"
  | "ph2"
  | "sg2"
  | "th2"
  | "tw2"
  | "vn2";

export type RoutingRegion = "americas" | "europe" | "asia" | "sea";

export const PLATFORM_REGIONS: { value: PlatformRegion; label: string }[] = [
  { value: "br1", label: "Brasil (BR)" },
  { value: "na1", label: "North America (NA)" },
  { value: "euw1", label: "Europe West (EUW)" },
  { value: "eun1", label: "Europe Nordic & East (EUNE)" },
  { value: "kr", label: "Korea (KR)" },
  { value: "jp1", label: "Japan (JP)" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "Oceania (OCE)" },
  { value: "tr1", label: "Turkey (TR)" },
  { value: "ru", label: "Russia (RU)" },
  { value: "ph2", label: "Philippines" },
  { value: "sg2", label: "Singapore" },
  { value: "th2", label: "Thailand" },
  { value: "tw2", label: "Taiwan" },
  { value: "vn2", label: "Vietnam" },
];

const PLATFORM_TO_ROUTING: Record<PlatformRegion, RoutingRegion> = {
  br1: "americas",
  na1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

export function isPlatformRegion(value: string): value is PlatformRegion {
  return value in PLATFORM_TO_ROUTING;
}

export function toRoutingRegion(platform: PlatformRegion): RoutingRegion {
  return PLATFORM_TO_ROUTING[platform];
}

export function platformHost(platform: PlatformRegion): string {
  return `https://${platform}.api.riotgames.com`;
}

export function routingHost(routing: RoutingRegion): string {
  return `https://${routing}.api.riotgames.com`;
}
