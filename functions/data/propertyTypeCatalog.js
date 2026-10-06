/**
 * The property-type tiles a seller picks from on the Location & Property Type
 * page, in display order, plus everything the FE needs to render that page
 * for the chosen type. Served to the FE via GET /v1/property/schema
 * (`propertyTypeOptions`), so adding or renaming a type is a change here only.
 *
 *   value        - registry key in validators/property/fieldRegistry.js
 *   slug         - id the FE uses in URLs and stores as properties/{id}.propertyType
 *   legacySlugs  - older slugs still found on existing drafts; resolve to `slug`
 *   label        - tile label
 *   displayName  - how the type reads elsewhere (dashboard, listing summaries)
 *   icon         - lucide icon name, kebab-case as on lucide.dev (checked by iconNames.test.js)
 *   detailsPage  - the Location & Property Type page for this type:
 *     layout  - "standard" | "rural" | "income" (page arrangement + CSS modifier)
 *     accent  - Save & Continue button colour: "orange" | "green" | "navy"
 *     title, lead, notice? - page heading, intro line, blue info banner
 *     sidebar - {titleLead, titleEmphasis, intro, listTitle?, bullets: [{lead, rest}],
 *                image: {src, alt}, showFastSetup, tip?: {title, text}}
 *
 * stackedTownhouse / coOperativeApartment aren't listed: they have no tile of
 * their own yet.
 */

const STANDARD_TITLE = "Let's build your listing together";
const STANDARD_LEAD = "Tell us about your property so we can create an accurate MLS® listing. " +
  "You can always adjust or add more details later.";
const UNSURE_NOTICE = "Tell us what you know. You can leave anything you're unsure about for review.";

const HOUSE_BULLETS = [
  {lead: "Buyers compare parking and garage options", rest: " as a top priority."},
  {lead: "Finished basements and separate entrances", rest: " add significant value."},
  {lead: "Outdoor space", rest: " like decks and large backyards is highly desirable."},
  {lead: "Location, schools and neighbourhood", rest: " amenities matter most."},
  {lead: "We'll help present your home professionally", rest: " so it stands out to the right buyers."},
];

const propertyTypeCatalog = [
  {
    value: "detached",
    slug: "detached",
    label: "Detached",
    displayName: "Detached Home",
    icon: "house",
    detailsPage: {
      layout: "standard",
      accent: "orange",
      title: STANDARD_TITLE,
      lead: STANDARD_LEAD,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Detached Home",
        intro: "Detached homes give buyers space, privacy and room to grow.",
        bullets: HOUSE_BULLETS,
        image: {src: "/assets/images/create-listing/detached-exterior.png", alt: "Detached home exterior"},
        showFastSetup: true,
      },
    },
  },
  {
    value: "semiDetached",
    slug: "semi-detached",
    label: "Semi-Detached",
    displayName: "Semi-Detached Home",
    icon: "house",
    detailsPage: {
      layout: "standard",
      accent: "orange",
      title: STANDARD_TITLE,
      lead: STANDARD_LEAD,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Semi-Detached Home",
        intro: "Semi-detached homes offer the perfect balance of space, value and community.",
        bullets: HOUSE_BULLETS,
        image: {src: "/assets/images/create-listing/semi-detached-exterior.png", alt: "Semi-detached home exterior"},
        showFastSetup: true,
      },
    },
  },
  {
    value: "condoApartment",
    slug: "condo-apartment",
    label: "Condo Apartment",
    displayName: "Condo Apartment",
    icon: "building-2",
    detailsPage: {
      layout: "standard",
      accent: "orange",
      title: STANDARD_TITLE,
      lead: STANDARD_LEAD,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Condo Apartment",
        intro: "Condo buyers look for specific details that help them compare and make confident decisions.",
        bullets: [
          {lead: "Maintenance fees are important to buyers", rest: ". They factor into affordability."},
          {lead: "Parking and lockers can add value", rest: ". These items are often in high demand."},
          {lead: "Building amenities influence decisions", rest: ". Great amenities help your property stand out."},
          {lead: "Floor level, views and exposure matter", rest: ". Buyers pay attention to what they can see."},
          {lead: "We'll help present your condo professionally", rest: ". So you get more interest and better results."},
        ],
        image: {
          src: "/assets/images/create-listing/condo-living-room-city-view.png",
          alt: "Condo living room with city view",
        },
        showFastSetup: true,
      },
    },
  },
  {
    value: "condoTownhouse",
    slug: "condo-townhouse",
    label: "Condo Townhouse",
    displayName: "Condo Townhouse",
    icon: "building-2",
    detailsPage: {
      layout: "standard",
      accent: "orange",
      title: STANDARD_TITLE,
      lead: STANDARD_LEAD,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Condo Townhouse",
        intro: "Condo townhouses give you the best of both worlds—space, privacy and low-maintenance living.",
        bullets: [
          {lead: "Buyers look for functional layouts", rest: " and multiple levels."},
          {lead: "Parking and locker availability", rest: " are important considerations."},
          {lead: "Low maintenance fees and building amenities", rest: " add extra value."},
          {lead: "Location, community and convenience", rest: " matter most."},
          {lead: "We'll help present your home professionally", rest: " so it stands out to the right buyers."},
        ],
        image: {src: "/assets/images/create-listing/condo-townhouse-exterior.png", alt: "Condo townhouse exterior"},
        showFastSetup: true,
      },
    },
  },
  {
    value: "rural",
    slug: "rural",
    label: "Rural / Acreage",
    displayName: "Rural Property",
    icon: "trees",
    detailsPage: {
      layout: "rural",
      accent: "green",
      title: "Tell us about your rural property",
      lead: "This helps us understand what makes your property special so we can create the most accurate " +
        "listing and attract the right buyers.",
      notice: UNSURE_NOTICE,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Rural / Acreage Property",
        intro: "Rural buyers are looking for space, lifestyle and opportunity.",
        bullets: [
          {lead: "Land size and usable acreage", rest: " matter."},
          {lead: "Water, septic and heating types", rest: " are important considerations."},
          {lead: "Outbuildings and land features", rest: " can add significant value."},
          {lead: "Buyers want to understand current use", rest: " and income potential."},
          {lead: "We'll help present your property", rest: " clearly and professionally."},
        ],
        image: {src: "/assets/images/create-listing/rural-property-barn-pond.png", alt: "Rural property with barn and pond"},
        showFastSetup: false,
        tip: {
          title: "You can update details anytime",
          text: "You'll have a chance to review and edit everything before your listing goes live.",
        },
      },
    },
  },
  {
    value: "residentialIncome",
    slug: "residential-income",
    legacySlugs: ["duplex-triplex"],
    label: "Residential Income",
    displayName: "Residential Income Property",
    icon: "warehouse",
    detailsPage: {
      layout: "income",
      accent: "navy",
      title: "Tell us about your residential income property",
      lead: "These details help buyers understand the building, the units, and its investment or " +
        "owner-occupancy potential.",
      notice: UNSURE_NOTICE,
      sidebar: {
        titleLead: "Selling a",
        titleEmphasis: "Residential Income Property",
        intro: "You're building wealth and creating opportunity.",
        listTitle: "Buyers look for:",
        bullets: [
          {lead: "Number of units and layout", rest: ""},
          {lead: "Occupancy and flexibility", rest: ""},
          {lead: "Separate entrances and privacy", rest: ""},
          {lead: "Parking and building access", rest: ""},
          {lead: "Income potential and future value", rest: ""},
        ],
        image: {
          src: "/assets/images/create-listing/duplex-triplex-exterior.png",
          alt: "Residential income building exterior",
        },
        showFastSetup: false,
        tip: {
          title: "We'll help you stand out",
          text: "Providing these details helps the right buyers see the full value and potential of your property.",
        },
      },
    },
  },
];

module.exports = {propertyTypeCatalog};
