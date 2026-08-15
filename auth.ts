import NextAuth, { type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import { jwtCallback, sessionCallback } from '@/lib/auth-callbacks'

export const authConfig: NextAuthConfig = {
  // AUTH_URL未設定（配信ドメイン未確定）でも動かすため。docs/decisions.md参照。
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          // gmail.readonlyは後続機能用。access_type/promptはrefresh_token取得のため（decisions.md参照）
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    error: '/auth/error',
  },
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
}

// ARC-03 (5): process.env を読んでよいのは DAL と設定モジュールだけ。これは設定モジュール。
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
