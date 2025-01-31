/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp", // Change this line
          },
        ],
      },
    ];
  },
  api: {
    responseLimit: "8mb",
    bodyParser: {
      sizeLimit: "10mb", // Set the desired limit here
    },
  },
  images: {
    domains: ["storage.googleapis.com", "zequencer.mypinata.cloud"],
  },
  future: {
    webpack5: true,
  },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

module.exports = nextConfig;
