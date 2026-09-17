import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";
import BottomNav from "../components/BottomNav";
import VipBadge, { vipMeta, withVipLevels } from "../components/VipBadge";
import { fetchPacks } from "../store/slices/packsSlice";

export default function Level() {
  const dispatch = useDispatch();
  const { packs, isLoading, error } = useSelector((s) => s.packs);
  const rawPacks = packs?.data || packs || [];
  const list = withVipLevels(rawPacks);

  useEffect(() => {
    if (!rawPacks.length) dispatch(fetchPacks());
  }, [dispatch, rawPacks.length]);

  return (
    <div className="p-2 md:p-6">
      <BackButton />
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">VIP Levels</h2>
      <p className="text-center text-sm text-gray-500 mb-6">Ten membership tiers, each with its own crown</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 md:mb-1 mb-52">
        {isLoading ? (
          <p className="text-center col-span-full">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center col-span-full">{error}</p>
        ) : list.length > 0 ? (
          list.map((pack, i) => {
            const meta = vipMeta(pack);
            return (
              <motion.div
                key={pack.id || i}
                className={`bg-white rounded-2xl shadow-lg p-5 flex flex-col border ${meta.border}`}
                whileHover={{ scale: 1.03, y: -3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <VipBadge pack={pack} size={64} />
                  <span className="text-red-600 font-bold text-lg">${pack.usd_value}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{pack.name}</h3>
                <p className={`text-xs font-semibold uppercase tracking-wide mt-0.5 mb-3 ${meta.text}`}>{meta.title}</p>
                <p className="text-gray-700 font-medium mb-3">{meta.metal} Member</p>
                <div className="space-y-1">
                  {(pack.description || "").split(/\r\n/).map((line, idx) => (
                    <p key={idx} className="text-gray-600 text-sm">{line.trim()}</p>
                  ))}
                </div>
              </motion.div>
            );
          })
        ) : (
          <p className="text-center col-span-full">No packs available.</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
