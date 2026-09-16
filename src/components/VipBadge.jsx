export const VIP_TIERS = [
  { level: 1, title: "Bronze Circlet", metal: "Bronze", wrap: "bg-[#F4E6D4]", ring: "ring-[#C08A4A]/40", border: "border-[#C08A4A]/30", text: "text-amber-800" },
  { level: 2, title: "Copper Crown", metal: "Copper", wrap: "bg-[#FBE6D8]", ring: "ring-[#E08A54]/40", border: "border-[#E08A54]/30", text: "text-orange-800" },
  { level: 3, title: "Silver Coronet", metal: "Silver", wrap: "bg-[#EEF2F6]", ring: "ring-[#8A93A3]/40", border: "border-slate-300", text: "text-slate-600" },
  { level: 4, title: "Gold Crown", metal: "Gold", wrap: "bg-[#FFF4D6]", ring: "ring-[#E8B923]/50", border: "border-amber-300", text: "text-amber-700" },
  { level: 5, title: "Rose Tiara", metal: "Rose gold", wrap: "bg-[#FDE8EA]", ring: "ring-[#C45C6A]/40", border: "border-rose-300", text: "text-rose-700" },
  { level: 6, title: "Platinum Imperial", metal: "Platinum", wrap: "bg-[#E9EEF6]", ring: "ring-[#7F8DA6]/40", border: "border-indigo-200", text: "text-indigo-700" },
  { level: 7, title: "Emerald Royal", metal: "Emerald", wrap: "bg-[#E7F6EC]", ring: "ring-[#1F7A4D]/40", border: "border-emerald-300", text: "text-emerald-800" },
  { level: 8, title: "Diamond Legend", metal: "Diamond", wrap: "bg-[#F3E8FF]", ring: "ring-[#7C3AED]/40", border: "border-violet-300", text: "text-violet-800" },
];

const VALUES = [0, 100, 500, 1000, 2500, 5000, 10000, 25000];
const MISSIONS = [40, 50, 60, 80, 90, 100, 120, 150];
const PROFITS = ["0.50", "0.80", "1.00", "1.20", "1.50", "1.80", "2.20", "3.00"];

export const DEFAULT_VIP_PACKS = VIP_TIERS.map((tier, i) => ({
  id: `vip-fallback-${tier.level}`,
  name: `VIP ${tier.level}`,
  usd_value: VALUES[i],
  daily_missions: MISSIONS[i],
  short_description: `${tier.title} — ${MISSIONS[i]} daily missions`,
  description: `${tier.title}\r\n${MISSIONS[i]} daily missions\r\n${PROFITS[i]}% product commission`,
  is_active: true,
  profit_percentage: PROFITS[i],
  icon: `/assets/vip/vip-${tier.level}.svg`,
}));

export function withEightVips(list) {
  const incoming = Array.isArray(list) ? list : [];
  if (incoming.length >= 8) return [...incoming].sort((a, b) => vipLevel(a) - vipLevel(b) || Number(a.usd_value) - Number(b.usd_value));
  const byLevel = new Map(incoming.map((pack) => [vipLevel(pack), pack]));
  return VIP_TIERS.map((tier, i) => byLevel.get(tier.level) || DEFAULT_VIP_PACKS[i]);
}

export function vipLevel(pack) {
  const n = parseInt(String(pack?.name || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(8, n);
}

export function vipMeta(pack) {
  return VIP_TIERS[vipLevel(pack) - 1];
}

export function vipIconSrc(pack) {
  return `/assets/vip/vip-${vipLevel(pack)}.svg`;
}

export default function VipBadge({ pack, size = 48, className = "", showRing = true }) {
  const meta = vipMeta(pack);
  const src = vipIconSrc(pack);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${showRing ? `ring-2 ${meta.ring}` : ""} ${meta.wrap} ${className}`}
      style={{ width: size, height: size }}
      title={`${pack?.name || `VIP ${meta.level}`} · ${meta.title}`}
    >
      <img src={src} alt={pack?.name || `VIP ${meta.level}`} className="w-full h-full object-cover" />
    </span>
  );
}
