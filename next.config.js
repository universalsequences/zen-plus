/** @type {import('next').NextConfig} */
const nextConfig = {
     images: {
         domains: ['storage.googleapis.com', 'zequencer.mypinata.cloud'],
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
}

module.exports = nextConfig
