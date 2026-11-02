import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lecteurs Excel / PDF utilisés côté serveur pour l'import des DQE.
  serverExternalPackages: ["exceljs", "unpdf"],
  experimental: {
    serverActions: {
      // Import de DQE (Excel / PDF) jusqu'à 15 Mo + marge multipart.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
