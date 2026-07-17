const ADDONS = [
  {
    id: 'professional_photography',
    label: 'Professional Photography Package',
    priceCents: 49900,
    description:
      'High-quality photos, floor plans, and a virtual tour that help buyers fall in love with your property online.',
    includes: ['Professional Photography', 'Floor Plans', 'Virtual Tour'],
    badge: 'Recommended Before MLS® Activation',
    section: 'recommended',
    sectionTitle: 'Recommended Before Your Listing Goes Live',
    sectionSubtitle: 'These services help prepare your property for a stronger start.',
    imageUrl: '/assets/images/create-listing/modern-kitchen-interior.png',
    imageAlt: 'Professionally photographed home interior',
  },
  {
    id: 'pre_listing_home_inspection',
    label: 'Pre-Listing Home Inspection',
    priceCents: 129900,
    description:
      'Identify issues before listing so buyers have confidence and negotiations stay smoother.',
    includes: [
      'Thorough home inspection',
      'Detailed inspection report',
      'Professional recommendations',
    ],
    badge: 'Recommended Before MLS® Activation',
    section: 'recommended',
    sectionTitle: 'Recommended Before Your Listing Goes Live',
    sectionSubtitle: 'These services help prepare your property for a stronger start.',
    imageUrl: '/assets/images/create-listing/semi-detached-exterior.png',
    imageAlt: 'Home exterior for pre-listing inspection',
  },
  {
    id: 'showing_coordination',
    label: 'Showing Coordination',
    priceCents: 24900,
    description:
      'We coordinate and confirm showing appointments on your behalf so you stay in control without the back-and-forth.',
    includes: [
      'Showing request management',
      'Appointment scheduling',
      "Confirmation with buyers' agents",
    ],
    badge: 'Available During Your Listing Period',
    section: 'during',
    sectionTitle: 'Optional Support During Your Listing',
    sectionSubtitle: 'Add these services anytime during your listing period.',
    imageUrl: '/assets/images/create-listing/furnished-room.png',
    imageAlt: 'Furnished room ready for showings',
  },
  {
    id: 'complete_offer_management',
    label: 'Complete Offer Management Service',
    priceCents: 99900,
    description:
      'Professional review and guidance when offers come in — from first review through acceptance.',
    includes: [
      'Offer review & comparison',
      'Negotiation guidance',
      'Condition tracking',
      'Document coordination',
      'Buyer agent communication',
      'Acceptance support',
    ],
    badge: 'Can Be Added Later If You Receive An Offer',
    section: 'offer',
    sectionTitle: 'When You Receive An Offer',
    sectionSubtitle: 'You can add this service later if you receive an offer.',
    imageUrl: '/assets/images/create-listing/empty-room.png',
    imageAlt: 'Quiet workspace for reviewing offers',
  },
];

const ADDONS_BY_ID = Object.fromEntries(ADDONS.map((addon) => [addon.id, addon]));

module.exports = { ADDONS, ADDONS_BY_ID };
