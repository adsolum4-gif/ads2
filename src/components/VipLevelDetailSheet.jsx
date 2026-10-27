import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdCheckCircle } from "react-icons/md";
import VipBadge, {
  amountToReachVip,
  vipDepositState,
  vipDescriptionLines,
  vipLevel,
  vipMeta,
  vipUnlockFeatures,
} from "./VipBadge";

export default function VipLevelDetailSheet({
  open,
  pack,
  balance = 0,
  currentLevel = 1,
  onClose,
  onDeposit,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!pack) return null;

  const meta = vipMeta(pack);
  const level = vipLevel(pack);
  const remaining = amountToReachVip(pack, balance);
  const isCurrent = level === currentLevel;
  const isUnlocked = remaining <= 0;
  const deposit = vipDepositState(pack, balance);
  const structured = vipUnlockFeatures(pack);
  const extraLines = vipDescriptionLines(pack).filter(
    (line) => !structured.some((f) => f.toLowerCase() === line.toLowerCase()),
  );
  const benefits = [...structured, ...extraLines];

  let statusLabel = "Available";
  let statusClass = "bg-gray-100 text-gray-700";
  if (isCurrent) {
    statusLabel = "Your current level";
    statusClass = "bg-red-100 text-red-700";
  } else if (isUnlocked) {
    statusLabel = "Unlocked";
    statusClass = "bg-emerald-100 text-emerald-800";
  } else {
    statusLabel = `Deposit $${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to unlock`;
    statusClass = "bg-amber-100 text-amber-900";
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close VIP details"
            className="fixed inset-0 z-[60] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vip-detail-title"
            className={`fixed z-[61] left-0 right-0 bottom-0 max-h-[88vh] rounded-t-3xl shadow-2xl border-t ${meta.border} bg-white flex flex-col`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <span className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <MdClose className="text-2xl" />
            </button>

            <div className="overflow-y-auto px-5 pb-8 pt-2">
              <div className="flex items-start gap-4">
                <VipBadge pack={pack} size={72} />
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{pack.name}</p>
                  <h2 id="vip-detail-title" className={`text-xl font-bold ${meta.text}`}>
                    {meta.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">{meta.metal} tier</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="inline-flex items-center rounded-lg bg-red-600 text-white text-sm font-bold px-3 py-1.5">
                  ${Number(pack.usd_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} balance
                </span>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusClass}`}>{statusLabel}</span>
              </div>

              {pack.short_description ? (
                <p className="mt-4 text-sm text-gray-700 leading-relaxed">{pack.short_description}</p>
              ) : null}

              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 mb-3">Membership benefits</h3>
                <ul className="space-y-2.5">
                  {benefits.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-gray-700 leading-snug">
                      <MdCheckCircle className="text-emerald-600 shrink-0 mt-0.5 text-lg" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isUnlocked && !isCurrent ? (
                <button
                  type="button"
                  onClick={() => onDeposit?.(deposit)}
                  className="mt-8 w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 shadow-md transition-colors"
                >
                  Deposit ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to unlock {pack.name}
                </button>
              ) : isCurrent ? (
                <p className="mt-8 text-center text-sm text-gray-600">
                  You are on this tier. Deposit more to reach the next VIP level.
                </p>
              ) : (
                <p className="mt-8 text-center text-sm text-emerald-700 font-medium">This tier is already unlocked with your balance.</p>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
