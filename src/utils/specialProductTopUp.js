import Swal from "sweetalert2";

export function isSpecialRecord(record) {
  return Boolean(record?.special_product) || Number(record?.penalty_hold) > 0;
}

/** Amount user still needs to deposit to clear wallet on-hold. */
export function specialTopUpOwed(walletOnHold, _penaltyHold = 0) {
  const holdValue = Number(walletOnHold);
  return Number.isFinite(holdValue) ? Math.abs(Math.min(holdValue, 0)) : 0;
}

export function isSpecialClearBlockedMessage(message) {
  if (typeof message !== "string" || !message.trim()) return false;
  return /pending transaction|clear it to proceed|not sufficient|top up|exceeds available balance/i.test(message);
}

export async function showSpecialTopUpRequiredModal(topUpAmount) {
  const topUpLabel = `$${Number(topUpAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  await Swal.fire({
    title: "Sorry",
    html: `<p style="line-height:1.5">The product total is higher than your available balance. Please top up with <strong>${topUpLabel}</strong> to clear this product. Contact customer care for any issues.</p>`,
    icon: "warning",
    confirmButtonText: "OK",
    confirmButtonColor: "#dc2626",
    width: 320,
    padding: "1.75em 1.1em 1.25em",
    customClass: { popup: "special-product-swal" },
  });
}
