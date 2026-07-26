import { ClerkProvider } from "@clerk/nextjs";

export function PilotAuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Controlled-demo deployments intentionally run without Clerk credentials.
  // The protected pilot routes still fail closed in their resource handlers.
  if (!publishableKey) return <>{children}</>;

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
