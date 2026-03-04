import { example } from "example";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["example-ui", "universa-ui"],
};

export default example().next(nextConfig);
