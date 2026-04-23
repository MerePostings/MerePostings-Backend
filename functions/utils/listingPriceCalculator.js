export const plans = [
  {
    id: "sell",
    basePrice: 900,
    addons: [
      { id: "pricing-guidance", price: 0 },
      { id: "professional-photography-homes", price: 399 },
      { id: "professional-photography-condo", price: 299 },
      { id: "showings-offer-support", price: 399 },
      { id: "trust-deposit-handling", price: 599 },
      { id: "social-media-boost", price: 199 },
    ]
  },
  {
    id: "assign",
    basePrice: 999,
    addons: [
      { id: "pricing-guidance", price: 0 },
      { id: "professional-photography-homes", price: 399 },
      { id: "professional-photography-condo", price: 299 },
      { id: "showings-offer-support", price: 399 },
      { id: "trust-deposit-handling", price: 599 },
      { id: "social-media-boost", price: 199 },
    ]
  },
  {
    id: "lease",
    basePrice: 499,
    addons: [
      { id: "pricing-guidance", price: 0 },
      { id: "professional-photography-homes", price: 399 },
      { id: "professional-photography-condo", price: 299 },
      { id: "showings-offer-support", price: 299 },
      { id: "trust-deposit-handling", price: 399 },
      { id: "tenant-credit-check", price: 79 },
    ]
  }
];

/**
 * @param {string} saleType -
 * @param {string[]} selectedAddonIds 
 * @param {string} propertyType -
 * @returns {{ lineItems: object[], totalCents: number, totalCAD: number }}
 */
export function calculateListingPrice(saleType, selectedAddonIds = []) {
    const plan = plans.find(p => p.id === saleType);
    if (!plan) throw new Error(`Unknown saleType: ${saleType}`);

    const lineItems = [];

    lineItems.push({
        id: 'base-plan',
        amountCAD: plan.basePrice,
        amountCents: plan.basePrice * 100,
    });

    for (const addonId of selectedAddonIds) {
        const addon = plan.addons.find(a => a.id === addonId);
        if (!addon) continue;

        if (addon.price === 0) continue;

        if (typeof addon.price === 'number') {
            lineItems.push({
                id: addon.id,
                amountCAD: addon.price,
                amountCents: addon.price * 100,
            });
        }
    }

    const totalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);

    return {
        lineItems,
        totalCents,
        totalCAD: totalCents / 100,
    };
}