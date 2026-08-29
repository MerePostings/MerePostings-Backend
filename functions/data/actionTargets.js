const ACTION_TARGETS = {
  LISTING_DETAIL: "listing_detail",
  ACTIONS_TAB: "actions_tab",
  APPOINTMENTS: "appointments",
};

const ACTION_TARGET_VALUES = Object.values(ACTION_TARGETS);

const buildActionUrl = (target, params = {}) => {
  switch (target) {
    case ACTION_TARGETS.LISTING_DETAIL:
      return `${process.env.FRONTEND_URL}/account/my-listings/${params.listingId}`;
    case ACTION_TARGETS.ACTIONS_TAB:
      return `${process.env.FRONTEND_URL}/account/actions`;
    case ACTION_TARGETS.APPOINTMENTS:
      return `${process.env.FRONTEND_URL}/account/appointments`;
    default:
      return null;
  }
};

module.exports = {ACTION_TARGETS, ACTION_TARGET_VALUES, buildActionUrl};
