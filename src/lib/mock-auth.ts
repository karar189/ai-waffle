/**
 * Mock auth – no API keys. Use when Clerk is disabled.
 */

export function useClerk() {
  return { user: null, signOut: () => {} };
}

export function useAuth() {
  return { isSignedIn: false, signOut: () => {} };
}

export function useSignIn() {
  return {
    signIn: { create: async (_opts: unknown) => ({ status: "complete", createdSessionId: "demo" }) },
    setActive: async (_session: unknown) => {},
    isLoaded: true,
  };
}

export function useSignUp() {
  return {
    signUp: {
      create: async (_opts: unknown) => {},
      prepareEmailAddressVerification: async (_opts: unknown) => {},
      attemptEmailAddressVerification: async (_opts: unknown) => ({
        status: "complete",
        createdSessionId: "demo",
      }),
    },
    setActive: async (_session: unknown) => {},
    isLoaded: true,
  };
}

export async function currentUser() {
  return null;
}
