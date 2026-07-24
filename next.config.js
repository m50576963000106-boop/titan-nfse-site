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
      },
      {
        source: '/dashbord/:path*',
        destination: 'https://nfse.titanbackoffice.com.br/dashbord/:path*',
        permanent: true,
      },
      {
        source: '/martyn/:path*',
        destination: 'https://martyn.titanbackoffice.com.br/:path*',
        permanent: true,
      }
    ]
  }
}