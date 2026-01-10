// Type declarations for Starlight virtual modules
// These are resolved at runtime by Starlight's Vite plugin

declare module "virtual:starlight/user-config" {
  interface StarlightConfig {
    pagefind: boolean;
    components: Record<string, string>;
    [key: string]: any;
  }
  const config: StarlightConfig;
  export default config;
}

declare module "virtual:starlight/components/LanguageSelect" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const LanguageSelect: AstroComponentFactory;
  export default LanguageSelect;
}

declare module "virtual:starlight/components/Search" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const Search: AstroComponentFactory;
  export default Search;
}

declare module "virtual:starlight/components/SiteTitle" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const SiteTitle: AstroComponentFactory;
  export default SiteTitle;
}

declare module "virtual:starlight/components/SocialIcons" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const SocialIcons: AstroComponentFactory;
  export default SocialIcons;
}

declare module "virtual:starlight/components/ThemeSelect" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";
  const ThemeSelect: AstroComponentFactory;
  export default ThemeSelect;
}
