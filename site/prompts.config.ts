// Set to true to use your own branding instead of prompts.chat branding
const useCloneBranding = true;

export default defineConfig({
  // Branding — Alpha / hello world
  branding: {
    name: "Alpha Prompt Library",
    logo: "/alpha-logo.svg",
    logoDark: "/alpha-logo-dark.svg",
    description: "Assigned to Gareth Lee Douglas Kirman — sole authorized user. Full copyright. Hello-world / publish ops.",
  },

  // Theme
  theme: {
    radius: "sm",        // "none" | "sm" | "md" | "lg"
    variant: "default",  // "flat" | "default" | "brutal"
    colors: {
      primary: "#6366f1",
    },
  },

  // Authentication
  auth: {
    provider: "github",  // "credentials" | "github" | "google" | "azure"
    allowRegistration: true,
  },

  // Features
  features: {
    privatePrompts: true,
    changeRequests: true,
    categories: true,
    tags: true,
    aiSearch: false,  // Requires OPENAI_API_KEY
  },

  // Homepage
  homepage: {
    useCloneBranding,  // Use Alpha branding on homepage
    achievements: {
      enabled: !useCloneBranding,  // Hide prompts.chat achievements
    },
    sponsors: {
      enabled: !useCloneBranding,  // Hide prompts.chat sponsors
    },
  },

  // Internationalization
  i18n: {
    locales: ["en", "es", "ja", "tr", "zh"],
    defaultLocale: "en",
  },
});
