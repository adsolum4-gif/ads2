import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";
import BottomNav from "../components/BottomNav";
import VipBadge, {
  amountToReachVip,
  vipFromBalance,
  vipLevel,
  vipMeta,
  withVipLevels,
} from "../components/VipBadge";
import VipLevelDetailSheet from "../components/VipLevelDetailSheet";
import { fetchPacks } from "../store/slices/packsSlice";

export default function Level() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { packs, isLoading, error } = useSelector((s) => s.packs);
  const user = useSelector((s) => s.profile.user);
  const rawPacks = packs?.data || packs || [];
  const list = withVipLevels(rawPacks);
  const balance = Number(user?.wallet?.balance || 0);
  const currentVip = vipFromBalance(list, balance);
  const [vipDetailPack, setVipDetailPack] = useState(null);

  useEffect(() => {
    if (!rawPacks.length) dispatch(fetchPacks());
  }, [dispatch, rawPacks.length]);

  const openVipDeposit = (deposit) => {
    setVipDetailPack(null);
    const amt = Number(deposit?.amount);
    if (Number.isFinite(amt) && amt > 0) {
      navigate(`/home/deposit?amount=${amt.toFixed(2)}`);
    } else {
      navigate("/home/deposit");
    }
  };

  return (
    <div className="p-2 md:p-6">
      <BackButton />
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">VIP Levels</h2>
      <p className="text-center text-sm text-gray-500 mb-6 px-2">
        Tap any tier to open benefits — like a membership channel. Deposit from the detail sheet when you are ready.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:mb-1 mb-52">
        {isLoading ? (
          <p className="text-center col-span-full">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center col-span-full">{error}</p>
        ) : list.length > 0 ? (
          list.map((pack, i) => {
            const meta = vipMeta(pack);
            const remaining = amountToReachVip(pack, balance);
            const isCurrent = vipLevel(pack) === vipLevel(currentVip);
            return (
              <motion.button
                type="button"
                key={pack.id || i}
                className={`bg-white rounded-2xl shadow-md p-4 flex flex-col items-center text-left border cursor-pointer ${isCurrent ? "border-red-500 ring-2 ring-red-200" : meta.border}`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVipDetailPack(pack)}
              >
                <div className="flex w-full items-center justify-between mb-3">
                  <VipBadge pack={pack} size={52} />
                  <span className="text-red-600 font-bold text-sm">
                    ${Number(pack.usd_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <h3 className="w-full text-base font-semibold text-gray-800">{pack.name}</h3>
                <p className={`w-full text-[11px] font-semibold uppercase tracking-wide mt-0.5 ${meta.text}`}>{meta.title}</p>
                <p className="w-full text-xs text-gray-500 mt-2 line-clamp-2">
                  {pack.short_description || "View membership benefits"}
                </p>
                <p className={`w-full mt-2 text-[11px] font-semibold ${isCurrent ? "text-red-600" : remaining > 0 ? "text-gray-500" : "text-emerald-600"}`}>
                  {isCurrent ? "Current level" : remaining > 0 ? "Tap for details" : "Unlocked"}
                </p>
              </motion.button>
            );
          })
        ) : (
          <p className="text-center col-span-full">No packs available.</p>
        )}
      </div>
      <VipLevelDetailSheet
        open={!!vipDetailPack}
        pack={vipDetailPack}
        balance={balance}
        currentLevel={vipLevel(currentVip)}
        onClose={() => setVipDetailPack(null)}
        onDeposit={openVipDeposit}
      />
      <BottomNav />
    </div>
  );
}
