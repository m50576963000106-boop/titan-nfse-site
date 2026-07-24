module.exports = {
  basePath: '',
  assetPrefix: 'https://nfse.titanbackoffice.com.br',
  async redirects() {
    return [
      {
        source: '/nfs/:path*',
        destination: 'https://nfse.titanbackoffice.com.br/:path*',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: 'https://nfse.titanbackoffice.com.br/admin/:path*',
        permanent: true,
      }
    ]
  }
}