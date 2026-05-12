import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "sharp"],
};

export default nextConfig;