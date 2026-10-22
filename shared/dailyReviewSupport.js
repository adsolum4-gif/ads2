/** Prefilled support message when a user asks to reset daily product review progress. */
export function dailyReviewResetSupportDraft(user) {
  const done = Number(user?.current_number_count ?? 0);
  const total = Number(user?.total_number_can_play ?? 0);
  const label = user?.username || user?.first_name || "your account";
  const progress = total > 0 ? `${done}/${total}` : `${done}`;
  return (
    `Hello Support, this is ${label}. I have completed my daily product reviews (${progress}) ` +
    `and would like help resetting my review progress so I can start a new optimization cycle. Thank you.`
  );
}

export const SUPPORT_STATE_OPEN_COMPOSER = "openSupportComposer";
export const SUPPORT_STATE_DRAFT = "supportDraft";
