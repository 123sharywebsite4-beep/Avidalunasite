// Local fallback content. The site renders from this when Sanity isn't configured,
// and Sanity's seed file is generated from the same copy (see /docs/copy-deck.md).
//
// Every line here comes from facts in the project brief. Anything we don't know yet
// carries a `todo` note (rendered as a dashed TODO box until NEXT_PUBLIC_HIDE_TODOS=1).

import type {
  AddOn,
  Article,
  EventItem,
  Faq,
  PageKey,
  PageText,
  PackageType,
  Service,
  SiteSettings,
  Testimonial,
} from "../src/lib/types";

export const siteSettings: SiteSettings = {
  phoneDisplay: "(941) 348-6972",
  phoneTel: "tel:9413486972",
  email: "YourRNShary@gmail.com",
  serviceArea: "Lakewood Ranch, Sarasota, Bradenton and nearby, FL",
  // TODO: Shary's Instagram and Facebook URLs. Links are hidden until these are set.
  instagram: null,
  facebook: null,
  footerNote:
    "Medical services are booked and screened through our secure, HIPAA-compliant booking partner. This website is general information, not medical advice.",
  travelFee: 8,
  travelIncludedMinutes: 35,
  ivInfusionTime: "About 35–40 minutes",
  // TODO: Shary to confirm a typical total appointment length for an IV visit.
  ivAppointmentTime:
    "Longer than the infusion. Allow extra time for your consultation, setup and any enhancements, which are done separately.",
};

// Communities shown as tags in the home page "Where we provide care" section.
// TODO: Shary to confirm coverage before publication. Add, remove or reorder
// names here; the section updates automatically.
export const serviceAreas: string[] = [
  "Sarasota",
  "Lakewood Ranch",
  "Bradenton",
  "Siesta Key",
  "Longboat Key",
  "Palmer Ranch",
  "University Park",
  "Fruitville",
  "Osprey",
  "Bee Ridge",
];

// The three main towns, each with its own heading on the Services page, and the
// neighborhoods listed under it. TODO: Shary to confirm coverage (same as above).
export const cityAreas: { city: string; text: string }[] = [
  {
    city: "Lakewood Ranch",
    text: "Lakewood Ranch is home base. Shary brings IV hydration and vitamin injections to homes, offices and community events across Lakewood Ranch and University Park.",
  },
  {
    city: "Sarasota",
    text: "In-home IV drips across Sarasota, including Palmer Ranch, Fruitville, Bee Ridge, Osprey and Siesta Key. No trip to an IV lounge: Shary comes to you.",
  },
  {
    city: "Bradenton",
    text: "Mobile IV hydration and B12 shots at your home, office or event in Bradenton and nearby Longboat Key.",
  },
];

export const services: Service[] = [
  {
    id: "service-recovery",
    name: "Hydration IV (Lactated Ringer's)",
    category: "iv",
    description:
      "Our essential IV. Fluids and electrolytes for a quick reset after a hard workout, a late night or a long week.",
    goodFor: "Workouts · Late nights · Long weeks",
    price: 99,
    showPrice: true,
    image: { src: "/services/iv-hydration.webp", alt: "An IV bag on a stand beside a cream lounge chair in a sunny room", width: 1536, height: 1024 },
  },
  {
    id: "service-athlete-recovery",
    name: "Athlete Recovery IV",
    category: "iv",
    description:
      "Amino acids and B12 with IV fluids, to support muscle recovery and endurance when you train hard.",
    goodFor: "Training · Endurance · Rest days",
    price: 180,
    showPrice: true,
    image: { src: "/services/athlete-recovery-towel.webp", alt: "A man resting on a mat with a towel around his neck and a water bottle after a workout", width: 1190, height: 892 },
  },
  {
    id: "service-energy",
    name: "Energy IV",
    category: "iv",
    description:
      "A blend of amino acids, vitamins and minerals to support your body\u2019s natural energy, for weeks when you\u2019re running on empty.",
    goodFor: "Busy weeks · Low-energy days",
    price: 180,
    showPrice: true,
    image: { src: "/services/energy.webp", alt: "A woman stretching on a sofa in a bright living room", width: 1448, height: 1086 },
  },
  {
    id: "service-reset",
    // Service name chosen by Shary (client-approved; see ALLOWED_SERVICE_NAMES in studio/lib/compliance.ts).
    name: "Detox/Hangover IV",
    category: "iv",
    description:
      "Fluids with essential vitamins and minerals, to rehydrate and help you bounce back after a big night out or a packed weekend.",
    goodFor: "Nights out · Travel · Busy weekends",
    price: 190,
    showPrice: true,
    image: { src: "/services/reset.webp", alt: "A woman relaxing on a sofa with a glass of water in a sunny living room", width: 2000, height: 1242 },
  },
  {
    id: "service-migraine",
    // Service name chosen by Shary (client-approved; see ALLOWED_SERVICE_NAMES in studio/lib/compliance.ts).
    name: "Migraine IV",
    category: "iv",
    description:
      "IV fluids with vitamins and minerals, given and monitored by Shary. Ask her whether it\u2019s a good fit for you.",
    price: 190,
    showPrice: true,
    image: null,
  },
  {
    id: "service-myers",
    name: "Myers IV",
    category: "iv",
    description:
      "The classic Myers cocktail: B vitamins, vitamin C, magnesium and calcium, to replenish electrolytes and leave you feeling restored.",
    goodFor: "Overall wellness · Relaxation",
    price: 199,
    showPrice: true,
    optionName: "Myers with Chromium IV",
    optionPrice: 240,
    image: { src: "/services/vitamin-vials.webp", alt: "Vitamin vials labeled Avida Luna on a stone tray", width: 1448, height: 1086 },
  },
  {
    id: "boost-b12",
    name: "B12 IV Add-On",
    category: "boost",
    description: "Vitamin B12, added to your IV.",
    price: 35,
    showPrice: true,
    image: null,
  },
  {
    id: "boost-b-complex",
    name: "B-Complex IV Add-On",
    category: "boost",
    description: "A blend of B vitamins, added to your IV.",
    price: 40,
    showPrice: true,
    image: null,
  },
  {
    id: "boost-glutathione",
    name: "Glutathione IV Add-On",
    category: "boost",
    description: "An antioxidant added to your IV.",
    price: 45,
    showPrice: true,
    image: null,
  },
  {
    id: "service-b12",
    name: "B12 IM Injection",
    category: "vitamin",
    description: "A quick vitamin B12 shot, given by Shary during your visit.",
    price: 40,
    showPrice: true,
    image: null,
  },
  {
    id: "service-b-complex",
    name: "B-Complex IM Injection",
    category: "vitamin",
    description: "A blend of B vitamins, given as a quick shot.",
    price: 45,
    showPrice: true,
    image: null,
  },
  {
    id: "service-glutathione",
    name: "Glutathione IM Injection",
    category: "vitamin",
    description: "A quick glutathione shot. Ask Shary if it\u2019s a fit for you.",
    price: 50,
    showPrice: true,
    image: null,
  },
];

// Restorative services and take-home products (non-medical). `price` is the standalone price;
// `enhancementPrice` applies when added to an existing appointment or package.
export const AROMATHERAPY_DURATION =
  "Aromatherapy \u2014 duration is based on your selected service and continues throughout that service.";

export const addOns: AddOn[] = [
  {
    id: "addon-red-light",
    name: "Targeted Red Light",
    description: "A relaxing, targeted red light session while you rest.",
    durationMinutes: 15,
    price: 29,
    enhancementPrice: 25,
    kind: "service",
    image: null,
  },
  {
    id: "addon-compression-boots",
    name: "Compression Boots",
    description: "Sit back and relax in compression boots.",
    durationMinutes: 30,
    price: 39,
    enhancementPrice: 35,
    kind: "service",
    image: null,
  },
  {
    id: "addon-aromatherapy",
    name: "Aromatherapy",
    // Runs alongside the service and adds no appointment time, so it has no duration.
    description: `${AROMATHERAPY_DURATION} It runs alongside your service and adds no appointment time.`,
    durationMinutes: null,
    price: 20,
    enhancementPrice: 15,
    kind: "service",
    image: null,
  },
  {
    id: "addon-vitamin-spray",
    name: "Vitamin Wellness Spray",
    description: "A take-home vitamin spray. $37 on its own, or $35 with a service or package.",
    durationMinutes: null,
    price: 37,
    enhancementPrice: 35,
    kind: "product",
    image: null,
  },
];

/**
 * Packages. One-time bookings only: no memberships, recurring billing or prepaid series.
 * `includes` and `ivChoices` are service / add-on ids (references in Sanity).
 */
export type PackageSeed = {
  id: string;
  slug: string;
  name: string;
  type: PackageType;
  includes: string[];
  ivChoices?: string[];
  price: number;
  bookingOpen: boolean;
};

export const packages: PackageSeed[] = [
  { id: "package-luna-light", slug: "luna-light", name: "Luna Light", type: "restorative", includes: ["addon-red-light", "addon-aromatherapy"], price: 45, bookingOpen: true },
  { id: "package-luna-reset", slug: "luna-reset", name: "Luna Reset", type: "restorative", includes: ["addon-red-light", "addon-compression-boots"], price: 65, bookingOpen: true },
  { id: "package-luna-signature-reset", slug: "luna-signature-reset", name: "Luna Signature Reset", type: "restorative", includes: ["addon-red-light", "addon-compression-boots", "addon-aromatherapy"], price: 79, bookingOpen: true },
  { id: "package-hydrate-and-unwind", slug: "hydrate-and-unwind", name: "Hydrate & Unwind", type: "iv", includes: ["service-recovery", "addon-red-light", "addon-aromatherapy"], price: 139, bookingOpen: true },
  { id: "package-recovery-reset", slug: "recovery-reset", name: "Recovery Reset", type: "iv", includes: ["addon-compression-boots"], ivChoices: ["service-energy", "service-athlete-recovery"], price: 209, bookingOpen: true },
  { id: "package-signature-luna-iv", slug: "signature-luna-iv-experience", name: "Signature Luna IV Experience", type: "iv", includes: ["service-myers", "addon-red-light", "addon-compression-boots", "addon-aromatherapy"], price: 269, bookingOpen: true },
  // Booking stays closed until Shary decides travel pricing for injection appointments.
  { id: "package-b12-and-light", slug: "b12-and-light", name: "B12 & Light", type: "injection", includes: ["service-b12", "addon-red-light"], price: 65, bookingOpen: false },
  { id: "package-b12-and-restore", slug: "b12-and-restore", name: "B12 & Restore", type: "injection", includes: ["service-b12", "addon-red-light", "addon-compression-boots"], price: 99, bookingOpen: false },
];

export const events: EventItem[] = [
  {
    id: "event-hydration-vibration-2026-11-15",
    slug: "hydration-vibration",
    title: "Hydration & Vibration: An Intentional Wellness Experience",
    date: "2026-11-15",
    startTime: "10:00",
    endTime: "13:00",
    place: "Private venue, Sarasota (address shared with registered guests)",
    description:
      "Three hours of IV hydration with electrolytes and vitamin B12, Yin yoga, a sound bath, hands-on body care with licensed practitioners, a floral arrangement to take home, light bites and a wellness beverage, with local women-owned wellness businesses. On-site telehealth consult for the IV included. Doors open at 9:30am. Ages 18+. Tickets from $107.48.",
    link: "https://www.eventbrite.com/e/hydration-vibration-an-intentional-wellness-experience-tickets-2003739804695",
    image: null,
  },
];

export const articles: Article[] = [
  {
    id: "article-understanding-iv-therapy",
    slug: "understanding-iv-therapy",
    title: "Understanding IV Therapy",
    summary:
      "A plain-language look at what a mobile IV visit is and what to expect.",
    body: [
      {
        type: "p",
        text: "A mobile IV visit brings nursing care to your location. Booking starts with your name and email on this website. Service selection, scheduling and confidential health screening happen on our secure, HIPAA-compliant booking page. Before an IV begins, Shary reviews your screening with you and checks that the service is a good fit. She stays with you throughout the visit.",
      },
    ],
    sources: [],
    image: null,
    publishedAt: "2026-11-01",
    todo: "Migrate the full article text and exact title from the current site, plus the PubMed source URL from Shary.",
  },
];

// FAQ page questions are grouped by id on /faq (see src/app/faq/page.tsx).
// `placement: "services"` puts a question on the Services page instead.
export const faqs: Faq[] = [
  // About mobile IV therapy
  {
    id: "faq-what-is",
    question: "What is mobile IV therapy?",
    answer:
      "Mobile IV therapy means a registered nurse comes to you and gives your IV drip at your home, office or event, instead of you visiting a clinic or IV lounge. With Avida Luna, that nurse is always Shary Gonzalez, RN, BSN. She reviews your health screening, assesses you in person, places your IV and stays with you until it's done.",
  },
  {
    id: "faq-services",
    question: "What services do you offer?",
    answer:
      "Mobile IV drips (Hydration IV (Lactated Ringer's), Energy IV, Athlete Recovery IV, Detox/Hangover IV, Migraine IV, Myers IV and Myers with Chromium IV), IM injections (B12, B-Complex and Glutathione), IV nutrient add-ons, wellness packages, and group and corporate IV events. Restorative services (targeted red light, compression boots and aromatherapy) can be booked on their own or added to an appointment, and our Vitamin Wellness Spray is available to take home.",
  },
  {
    id: "faq-cost",
    question: "How much does mobile IV therapy cost?",
    answer:
      "Hydration IV (Lactated Ringer's) is $99. Energy IV and Athlete Recovery IV are $180, Detox/Hangover IV and Migraine IV are $190, Myers IV is $199 and Myers with Chromium IV is $240. IM injections are $40 to $50, and IV nutrient add-ons are $35 to $45. Restorative services start at $20, and packages start at $45. Each booking is a one-time visit: no memberships, subscriptions or prepaid series.",
  },
  {
    id: "faq-spanish",
    question: "¿Hablas español?",
    answer:
      "Sí. Shary habla inglés y español. Puedes llamarnos o escribirnos en español.",
  },
  // Booking and payment
  {
    id: "faq-book",
    question: "How do I book?",
    answer:
      "For an IV, tap Book and share your name and email. You'll get your booking link right away, then pick your services, a time, and complete your screening and payment on our secure, HIPAA-compliant booking page. Once Shary reviews your screening, you'll be asked to get cleared by our medical provider before your visit. Optional enhancements come after. For red light, compression boots or aromatherapy on their own, send a restorative visit request with a few preferred times and Shary will confirm by text or email.",
  },
  {
    id: "faq-pay",
    question: "How do I pay?",
    answer:
      "IVs and IM injections are booked and paid on our secure, HIPAA-compliant booking page. Restorative services, enhancements and the Vitamin Wellness Spray are paid at your visit, by tap to pay or card. For a package that includes an IV, you pay the IV's price on the booking page and the rest of the package price at your visit.",
  },
  {
    id: "faq-addons",
    question: "Can I add red light, compression boots or aromatherapy?",
    answer:
      "Yes. Added to an appointment you've already booked, they're enhancement prices: targeted red light (15 minutes) $25, compression boots (30 minutes) $35, aromatherapy $15, and the take-home Vitamin Wellness Spray $35. Booked on their own they're $29, $39 and $20, and the spray is $37. Aromatherapy \u2014 duration is based on your selected service and continues throughout that service. Pay at your visit.",
  },
  {
    id: "faq-packages",
    question: "Do you offer packages or memberships?",
    answer:
      "We offer wellness packages that combine services in one visit, such as Hydrate & Unwind or Luna Signature Reset. Every package is a one-time booking: there are no memberships, recurring billing or prepaid multi-visit series. Packages with an IV or IM injection include the required medical consultation at no extra charge.",
  },
  {
    id: "faq-cancel",
    question: "What's your cancellation and refund policy?",
    answer: "Our cancellation and refund policy will be posted here.",
    todo: "Cancellation and refund policy from Shary.",
  },
  // Your visit
  {
    id: "faq-get-started",
    question: "How does an in-home IV visit work?",
    answer:
      "Three steps: request an appointment (share your name and email, then choose a service and time on our secure booking page), complete a health screening and assessment, and Shary comes to your home, office or event.",
  },
  {
    id: "faq-before",
    question: "What happens before my appointment?",
    answer:
      "Every appointment includes a confidential health screening on our secure, HIPAA-compliant booking page, and Shary reviews it before your IV begins. Your health information stays there, never on this website.",
    todo: "Confirm with Shary exactly what the booking screening asks clients before a visit.",
  },
  {
    id: "faq-during",
    question: "What happens during my appointment?",
    answer:
      "Shary arrives at your location, reviews your screening with you, and checks your vital signs. She then places your IV and stays with you while it runs. Most of the visit is simply time to sit back and rest.",
    todo: "Shary to confirm the visit steps and the typical length.",
  },
  {
    id: "faq-length",
    question: "How long does a visit take?",
    answer:
      "An IV infusion takes about 35\u201340 minutes. The full appointment takes longer, because it includes your consultation, setup and any enhancements, which are done separately. Targeted red light is 15 minutes and compression boots are 30 minutes. Aromatherapy \u2014 duration is based on your selected service and continues throughout that service, so it adds no appointment time.",
    todo: "Typical total IV appointment length from Shary.",
  },
  {
    id: "faq-who",
    question: "Who comes to my appointment?",
    answer: "Shary, a registered nurse, comes to your appointment herself.",
    todo: "Confirm with Shary whether anyone else ever attends appointments.",
  },
  // Safety and eligibility
  {
    id: "faq-eligibility",
    question: "Is IV therapy right for me?",
    answer:
      "Not everyone is a good fit for IV therapy, and that's why every appointment starts with a health screening. If anything in your screening or at your visit suggests an IV isn't right for you, Shary will tell you and suggest you speak with your doctor.",
    todo: "Shary to confirm the eligibility wording and any groups she doesn't serve (for example, minors).",
  },
  {
    id: "faq-safety",
    question: "Who places my IV, and how is safety handled?",
    answer:
      "Shary, a registered nurse with more than 17 years of nursing experience, places and monitors every IV herself. She uses sterile, single-use supplies and stays with you for the whole visit.",
    todo: "Shary to confirm the safety details (supplies, monitoring, medical director oversight through the booking partner).",
  },
  // Service area and group events
  {
    id: "faq-travel",
    question: "Do you come to Sarasota and Bradenton? Is there a travel fee?",
    answer:
      "Shary is based in Lakewood Ranch and comes to homes, offices and events in Lakewood Ranch, Sarasota, Bradenton and nearby communities, including Siesta Key, Longboat Key, Palmer Ranch, University Park, Fruitville, Osprey and Bee Ridge. For IV appointments, including those with restorative enhancements, travel is included within a 35-minute one-way drive from her service starting location. Additional travel charges may apply and will be confirmed before booking. Restorative-only appointments have an $8 travel fee, once per appointment.",
    todo: "Shary to confirm the service area and travel for injection-only appointments.",
  },
  {
    id: "faq-groups",
    question: "Do you offer group IV therapy or IV parties?",
    answer:
      "Yes. Shary coordinates mobile IV hydration for workplaces, bachelorette and bridal parties, private celebrations and community events. Each guest is screened individually. Tell us about your event on our Group & corporate page.",
  },
  // Services page
  {
    id: "faq-svc-choose",
    placement: "services",
    question: "Which IV drip should I choose?",
    answer:
      "Hydration IV (Lactated Ringer's) is our essential IV: fluids and electrolytes. Athlete Recovery IV adds amino acids and B12 for training days, Energy IV is a blend of amino acids, vitamins and minerals for busy weeks, and Myers IV is the classic Myers cocktail. Not sure? Shary talks it through with you after your screening.",
  },
  {
    id: "faq-svc-myers",
    placement: "services",
    question: "What's in a Myers cocktail IV?",
    answer:
      "The classic Myers cocktail blend of B vitamins, vitamin C, magnesium and calcium, given with IV fluids. Myers IV is $199, and Myers with Chromium IV is $240.",
  },
  {
    id: "faq-svc-at-home",
    placement: "services",
    question: "Can I get IV therapy at home?",
    answer:
      "Yes. Every Avida Luna service is mobile. Shary brings everything needed for your IV to your home, office or event in Lakewood Ranch, Sarasota, Bradenton and nearby communities, so there's no clinic or IV lounge to visit.",
  },
  {
    id: "faq-svc-b12",
    placement: "services",
    question: "Can I get a B12 shot without an IV?",
    answer:
      "B12 IM Injection ($40), B-Complex IM Injection ($45) and Glutathione IM Injection ($50) are on our menu. Booking for injection-only appointments opens soon. Every injection starts with a health screening.",
  },
  {
    id: "faq-svc-add-ins",
    placement: "services",
    question: "Can I add vitamins to my IV drip?",
    answer:
      "Yes. You can add B12 IV Add-On ($35), B-Complex IV Add-On ($40) or Glutathione IV Add-On ($45) to any IV. They're added to your IV, not given as separate shots. Your nurse may suggest other add-ins based on your assessment.",
  },
  {
    id: "faq-svc-screening",
    placement: "services",
    question: "Do I need a health screening for an IV or injection?",
    answer:
      "Yes, for every IV and injection. You complete a confidential, HIPAA-compliant screening when you book, and Shary reviews it and assesses you in person before anything begins. If a service isn't a good fit for you, she'll tell you.",
  },
];

export const testimonials: Testimonial[] = [];

export const pageText: Record<PageKey, PageText> = {
  home: {
    heading: "Mobile IV therapy in Lakewood Ranch and Sarasota, brought to you.",
    intro:
      "In-home IV hydration, vitamin injections and group IV events, provided by Shary Gonzalez, RN, BSN, at your home, office or event.",
    sections: {
      services: { heading: "In-home IV therapy, designed around your needs" },
      meet: {
        heading: "Your mobile IV nurse, who knows your name.",
        text: "With more than 17 years of nursing experience, Shary founded Avida Luna to bring professional, personalized wellness services directly to her community.\n\nRather than navigating a large clinic, patients connect directly with the nurse behind the practice. The nurse you speak with is the nurse who comes to your appointment.",
      },
      how: { heading: "How an at-home IV visit works" },
      menu: { heading: "IV drip menu and prices" },
      areas: {
        heading: "Mobile IV therapy in Lakewood Ranch, Sarasota and Bradenton",
        text: "Nurse-led IV hydration at homes, offices and private events across Lakewood Ranch, Sarasota, Bradenton and nearby communities.",
      },
      faq: { heading: "Mobile IV therapy questions" },
      cta: {
        heading: "Ready to book IV therapy at home?",
        text: "Professional care, personally delivered.",
      },
    },
  },
  services: {
    heading: "Mobile IV drips and vitamin shots in Lakewood Ranch and Sarasota",
    intro:
      "In-home IV hydration, B12 and vitamin injections, consultations and group IV events from Shary Gonzalez, RN, BSN. Every appointment includes a health screening, and Shary assesses you in person before your IV begins.",
    sections: {
      iv: {
        heading: "IV hydration drip menu",
        text: "Mobile IV drips, given and monitored by Shary, a registered nurse, at your home, office or event.",
      },
      consultation: {
        heading: "Personalized consultations",
        text: "Some services are personalized and start with a screening consultation. Talk through your goals, health history and available services directly with your nurse.",
      },
      boost: {
        heading: "IV nutrient add-ons",
        text: "Added to your IV, not given as separate shots. Your nurse may suggest other add-ins based on your assessment.",
      },
      vitamin: {
        heading: "IM injections",
        text: "A quick vitamin shot. Booking for injection-only appointments opens soon.",
      },
      packages: {
        heading: "Wellness packages",
        text: "Restorative, IV and B12 packages, each booked as a single visit.",
      },
      addons: {
        heading: "Restorative services and enhancements",
        text: "Book them on their own, or add them to an appointment at the lower enhancement price. Paid at your visit.",
      },
      groups: {
        heading: "Group IV therapy for events and workplaces",
        text: "IV hydration for your workplace, private party or event. Plan the timing and setup directly with Shary.",
      },
      areas: {
        heading: "Mobile IV therapy near you",
        text: "Not on the list? Ask when you book. Availability depends on your location and scheduling.",
      },
      faq: { heading: "Questions about IV drips and injections" },
      how: { heading: "How in-home IV appointments work" },
    },
  },
  packages: {
    heading: "Wellness packages",
    intro:
      "Restorative, IV and B12 wellness packages, each a single visit at your home, office or event. One-time bookings only: no memberships or prepaid series.",
    sections: {
      restorative: {
        heading: "Restorative packages",
        text: "Red light, compression boots and aromatherapy. No IVs or injections, so you book directly with Shary.",
      },
      iv: {
        heading: "IV wellness packages",
        text: "An IV plus restorative services in one visit. You book and pay for the IV on our secure booking page, and pay the rest at your visit.",
      },
      injection: {
        heading: "B12 wellness packages",
        text: "A B12 IM Injection with restorative services in one visit.",
      },
    },
  },
  addons: {
    heading: "Restorative enhancements for your visit",
    intro:
      "Make it a ritual. Optional extras for an appointment you've already booked, at enhancement prices. Choose them here, then pay at your visit.",
    sections: {},
  },
  events: {
    heading: "Group IV therapy and IV hydration parties",
    intro:
      "Mobile IV hydration for workplaces, bachelorette and bridal parties, celebrations and community events in Lakewood Ranch, Sarasota and Bradenton. Each guest is screened individually, and Shary manages every IV on site.",
    sections: {
      who: { heading: "IV hydration for teams, parties and events" },
      how: { heading: "How a group IV event works" },
      upcoming: {
        heading: "Upcoming IV hydration events",
        text: "No public events right now. Want one for your group? Ask below.",
      },
      form: {
        heading: "Request a group IV event",
        text: "Tell us a little about your group and Shary will get back to you.",
      },
    },
  },
  education: {
    heading: "IV therapy and wellness education",
    intro:
      "Plain-language reading from Shary. General information, not medical advice.",
    sections: {},
  },
  about: {
    heading: "Shary Gonzalez, RN, BSN",
    intro:
      'Shary Gonzalez is a registered nurse with a BSN, more than 17 years in nursing and 25 years in healthcare. She founded Avida Luna to bring professional, personalized care directly to her community.',
    sections: {
      story: {
        heading: "Why Shary brings IV therapy to you",
        text: "Shary started Avida Luna because she wanted care to feel personal again: one nurse, who knows your name, taking the time to do things properly.\n\nWhen you book with Avida Luna, Shary is the nurse who shows up. Not a call center, and not a rotating staff. She reviews your screening, assesses you in person, places your IV and stays with you for the whole visit, at your home, your office or your event.\n\nShe speaks English and Spanish, so you can talk through your care in whichever language feels better for you.",
      },
      credentials: { heading: "Nursing credentials" },
      mission: { text: "" },
    },
  },
  faq: {
    heading: "Mobile IV therapy FAQ",
    intro:
      "Cost, booking, screening, safety and what to expect at your in-home IV appointment in Lakewood Ranch, Sarasota or Bradenton. Still wondering about something? Get in touch.",
    sections: {},
  },
  contact: {
    heading: "Contact your mobile IV nurse",
    intro:
      "Questions about IV services, group events or partnerships. Shary will get back to you personally, in English or Spanish.",
    sections: {},
  },
  book: {
    heading: "Book your mobile IV appointment",
    intro:
      "Takes 30 seconds and you get your booking link right away. Next, you'll pick your IV and a time, then complete a short health screening and payment on our secure booking page.",
    sections: {},
  },
  join: {
    heading: "Wellness Notes from a Nurse",
    intro:
      "Thoughtful, nurse-led notes and practical reminders to support your long-term health, one intentional choice at a time. #LiveWellLonger",
    sections: {},
  },
};

/** Credentials as listed on her current site. TODO: confirm each with Shary. */
export const credentials = [
  "Registered Nurse (RN)",
  "Bachelor of Science in Nursing (BSN)",
  "17+ years in nursing",
  "25 years in healthcare",
  "Bilingual: English and Spanish",
];
