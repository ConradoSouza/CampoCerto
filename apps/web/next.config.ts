import type { NextConfig } from "next";

const config: NextConfig = {
  // Os pacotes do monorepo são publicados como TypeScript e compilados pela web.
  transpilePackages: ["@campocerto/regras", "@campocerto/tipos"],
  typedRoutes: false,
};

export default config;
