// src/services/auth.ts
export interface AuthCustomer {
  uid: string;
  email: string;
}

export async function verifyIdToken(idToken: string): Promise<AuthCustomer> {
  if (!idToken) {
    throw new Error("ID token tidak ditemukan");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API key tidak dikonfigurasi");
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!res.ok) {
    throw new Error("ID token tidak valid");
  }

  const data = await res.json();
  const user = data?.users?.[0];

  if (!user || !user.localId || !user.email) {
    throw new Error("User tidak ditemukan dari token");
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}

export async function getCustomerFromRequest(
  req: Request,
): Promise<AuthCustomer> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error("Authorization header tidak valid");
  }
  return verifyIdToken(match[1]);
}
