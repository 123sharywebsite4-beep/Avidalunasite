export const mainNav = [
  { href: "/services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "Meet your nurse" },
  { href: "/events", label: "Group & corporate" },
  { href: "/wellness-education", label: "Wellness education" },
  { href: "/faq", label: "FAQ" },
] as const;

/** Secondary pages: reachable from the mobile menu and footer, kept out of the main bar. */
export const secondaryNav = [
  { href: "/contact", label: "Contact" },
  { href: "/add-ons", label: "Enhancements" },
] as const;
