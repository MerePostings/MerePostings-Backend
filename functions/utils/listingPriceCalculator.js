const { ADDONS_BY_ID } = require('../data/addons');

function calculateListingPrice(selectedAddonIds = []) {
  let totalCents = parseInt(process.env.BASE_FEE_CENTS, 10);
  for (const id of selectedAddonIds) {
    const addon = ADDONS_BY_ID[id];
    if (!addon) throw new Error(`Unknown addon id: ${id}`);
    totalCents += addon.priceCents;
  }
  return { totalCents, totalCAD: totalCents / 100 };
}

module.exports = calculateListingPrice