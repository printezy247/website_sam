import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({
  locales: ["ms", "en"],
  defaultLocale: "ms",
  localePrefix: "as-needed",
});
export type Locale = (typeof routing.locales)[number];
