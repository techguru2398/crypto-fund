import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from '@/lib/hash';
import { pool } from "@/lib/db"; // Your pg client

declare module "next-auth" {
    interface Session {
      user: {
        id: string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
      };
    }
  
    interface User {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string | null;
    }
  
    interface JWT {
        id: string | number;
        name?: string | null;
        email?: string | null;
        role?: string | null;
    }
}

export const authOptions: AuthOptions= {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: {
        timeout: 15000, // Increase to 15 seconds
      },
    }),

    CredentialsProvider({
        name: "Email and Password",
        credentials: {
            email: { label: "Email", type: "text" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
                throw new Error("Email and password required");
            }

            const res = await pool.query("SELECT * FROM user_info WHERE email = $1", [credentials.email]);
            const user = res.rows[0];
            if (!user || !user.password_hash) throw new Error("User not found or missing password");

            const isValid = await verifyPassword(credentials.password, user.password_hash);
            if (!isValid) 
                throw new Error("Invalid password");
            return { id: user.id, name: user.name, email: user.email, role: user.role };
        },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, account, user, profile }) {
        if (account?.provider === "google") {
            const email = profile?.email;
            const name = profile?.name;

            const res = await pool.query("SELECT * FROM user_info WHERE email = $1", [email]);

            if (res.rows.length === 0) {
                const insertRes = await pool.query(
                    `INSERT INTO user_info (name, email, role) VALUES ($1, $2, $3) RETURNING id`,
                    [name, email, "user"]
                );
                token.id = insertRes.rows[0].id;
                token.email = insertRes.rows[0].email;
                token.name = insertRes.rows[0].name;
                token.role = insertRes.rows[0].role;
            } else {
                token.id = res.rows[0].id;
                token.email = res.rows[0].email;
                token.name = res.rows[0].name;
                token.role = res.rows[0].role;
            }
        }

        if (user) {
            token.id = user.id;
            token.name = user.name;
            token.email = user.email;
            token.role = "user";
        }
        return token;
    },

    async session({ session, token }) {
        if (session.user) {
            session.user.id = token.id as string;
            session.user.email = token.email;
            session.user.role = token.role as string | null | undefined;
        }
        return session;
    },
  },
};

