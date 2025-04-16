// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Example: Keep other valid Next.js options here
  images: {
    // Combine domains under the images key
    domains: [
        'i.pinimg.com',
        'flowbite.s3.amazonaws.com',
        'via.placeholder.com',
        'assets.aceternity.com',
        'media.istockphoto.com',
        'ik.imagekit.io',
        'images.unsplash.com'
    ]
  },
  // Add the rewrites configuration for proxying
  async rewrites() {
    // Proxy requests only in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log("Applying development rewrites to proxy /api to localhost:5000"); // Add log
      return [
        {
          source: '/api/:path*', // Match any request starting with /api/
          destination: 'http://localhost:5000/api/:path*', // Proxy to backend
        },
        // You can add other rewrites here if needed
      ];
    }
    // No rewrites needed in production if using backend CORS or other proxy setup
    return [];
  },
};

module.exports = nextConfig; // Use module.exports for the final config object