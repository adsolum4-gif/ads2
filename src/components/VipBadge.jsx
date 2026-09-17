export const VIP_COUNT = 10;

export const VIP_TIERS = [
  { level: 1, title: "Bronze Circlet", metal: "Bronze", wrap: "bg-[#F4E6D4]", ring: "ring-[#C08A4A]/40", border: "border-[#C08A4A]/30", text: "text-amber-800" },
  { level: 2, title: "Copper Crown", metal: "Copper", wrap: "bg-[#FBE6D8]", ring: "ring-[#E08A54]/40", border: "border-[#E08A54]/30", text: "text-orange-800" },
  { level: 3, title: "Silver Coronet", metal: "Silver", wrap: "bg-[#EEF2F6]", ring: "ring-[#8A93A3]/40", border: "border-slate-300", text: "text-slate-600" },
  { level: 4, title: "Gold Crown", metal: "Gold", wrap: "bg-[#FFF4D6]", ring: "ring-[#E8B923]/50", border: "border-amber-300", text: "text-amber-700" },
  { level: 5, title: "Rose Tiara", metal: "Rose gold", wrap: "bg-[#FDE8EA]", ring: "ring-[#C45C6A]/40", border: "border-rose-300", text: "text-rose-700" },
  { level: 6, title: "Platinum Imperial", metal: "Platinum", wrap: "bg-[#E9EEF6]", ring: "ring-[#7F8DA6]/40", border: "border-indigo-200", text: "text-indigo-700" },
  { level: 7, title: "Emerald Royal", metal: "Emerald", wrap: "bg-[#E7F6EC]", ring: "ring-[#1F7A4D]/40", border: "border-emerald-300", text: "text-emerald-800" },
  { level: 8, title: "Diamond Legend", metal: "Diamond", wrap: "bg-[#F3E8FF]", ring: "ring-[#7C3AED]/40", border: "border-violet-300", text: "text-violet-800" },
  { level: 9, title: "Sapphire Sovereign", metal: "Sapphire", wrap: "bg-[#DBEAFE]", ring: "ring-[#2563EB]/40", border: "border-blue-300", text: "text-blue-800" },
  { level: 10, title: "Celestial Crown", metal: "Celestial", wrap: "bg-[#111827]", ring: "ring-[#F59E0B]/50", border: "border-amber-400", text: "text-amber-300" },
];

const VALUES = [0, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
const MISSIONS = [40, 50, 60, 80, 90, 100, 120, 150, 180, 200];
const PROFITS = ["0.50", "0.80", "1.00", "1.20", "1.50", "1.80", "2.20", "3.00", "3.50", "4.00"];
const MAX_WITHDRAW = [5000, 10000, 20000, 40000, 80000, 150000, 300000, 500000, 750000, 1000000];
const WITHDRAWALS = [1, 1, 2, 3, 3, 4, 5, 8, 10, 15];

export const DEFAULT_VIP_PACKS = VIP_TIERS.map((tier, i) => ({
  id: `vip-fallback-${tier.level}`,
  name: `VIP ${tier.level}`,
  usd_value: VALUES[i],
  daily_missions: MISSIONS[i],
  daily_withdrawals: WITHDRAWALS[i],
  short_description: `${tier.title} — ${MISSIONS[i]} daily missions`,
  description: `${tier.title}\r\n${MISSIONS[i]} daily missions\r\n${PROFITS[i]}% product commission`,
  is_active: true,
  profit_percentage: PROFITS[i],
  icon: `/assets/vip/vip-${tier.level}.svg`,
}));

export function withVipLevels(list) {
  const incoming = Array.isArray(list) ? list : [];
  if (incoming.length >= VIP_COUNT) {
    return [...incoming].sort((a, b) => vipLevel(a) - vipLevel(b) || Number(a.usd_value) - Number(b.usd_value));
  }
  const byLevel = new Map(incoming.map((pack) => [vipLevel(pack), pack]));
  return VIP_TIERS.map((tier, i) => byLevel.get(tier.level) || DEFAULT_VIP_PACKS[i]);
}

export const withEightVips = withVipLevels;

export function vipLevel(pack) {
  const n = parseInt(String(pack?.name || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(VIP_COUNT, n);
}

export function vipMeta(pack) {
  return VIP_TIERS[vipLevel(pack) - 1];
}

export function vipIconSrc(pack) {
  return `/assets/vip/vip-${vipLevel(pack)}.svg`;
}

export function vipFromBalance(packs, balance) {
  const list = withVipLevels(packs);
  const bal = Number(balance || 0);
  let current = list[0] || DEFAULT_VIP_PACKS[0];
  list.forEach((pack) => {
    if (bal >= Number(pack.usd_value || 0)) current = pack;
  });
  return current;
}

export function amountToReachVip(pack, balance) {
  const need = Number(pack?.usd_value || 0) - Number(balance || 0);
  return Math.max(0, Math.round(need * 100) / 100);
}

export function vipUnlockFeatures(pack) {
  const meta = vipMeta(pack);
  const level = meta.level;
  const missions = pack?.daily_missions ?? MISSIONS[level - 1];
  const profit = pack?.profit_percentage ?? PROFITS[level - 1];
  const withdrawals = pack?.daily_withdrawals ?? WITHDRAWALS[level - 1];
  const maxWithdraw = MAX_WITHDRAW[level - 1];
  return [
    `${missions} daily product missions`,
    `${profit}% commission on completed products`,
    `${withdrawals} daily withdrawal${Number(withdrawals) === 1 ? "" : "s"}`,
    `Maximum withdrawal of $${Number(maxWithdraw).toLocaleString()}`,
    `${meta.title} member badge`,
    level >= 3 ? "Invite new users after 10 days of activity" : "Inviting unlocks from VIP 3",
  ];
}

export function nextVipToUnlock(packs, balance) {
  const list = withVipLevels(packs);
  return list.find((pack) => amountToReachVip(pack, balance) > 0) || list[list.length - 1];
}

export function vipDepositState(pack, balance) {
  const meta = vipMeta(pack);
  const remaining = amountToReachVip(pack, balance);
  return {
    amount: remaining,
    alreadyUnlocked: remaining <= 0,
    packName: pack?.name || `VIP ${meta.level}`,
    title: meta.title,
    level: meta.level,
    features: vipUnlockFeatures(pack),
    targetAmount: Number(pack?.usd_value || 0),
  };
}

export default function VipBadge({ pack, size = 48, className = "", showRing = true }) {
  const meta = vipMeta(pack);
  const src = vipIconSrc(pack);
  const dark = meta.level === 10;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${showRing ? `ring-2 ${meta.ring}` : ""} ${meta.wrap} ${className}`}
      style={{ width: size, height: size }}
      title={`${pack?.name || `VIP ${meta.level}`} · ${meta.title}`}
    >
      <img src={src} alt={pack?.name || `VIP ${meta.level}`} className={`w-full h-full object-cover ${dark ? "" : ""}`} />
    </span>
  );
}
