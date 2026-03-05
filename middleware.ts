export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/installments/:path*', '/profile/:path*', '/admin/:path*'],
}
