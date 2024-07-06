/** @type {import('next').NextConfig} */
const nextConfig = {
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
