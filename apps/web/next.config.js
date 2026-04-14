/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*` },
    ]
  },

  // Quan el domini sigui lpd.assessoria30.com, redirigeix / → /rgpd
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'lpd.assessoria30.com' }],
        destination: '/rgpd',
        permanent: false,
      },
    ]
  },
}
module.exports = nextConfig
