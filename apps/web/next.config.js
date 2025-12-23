module.exports = {
  transpilePackages: ['@cay/database'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}