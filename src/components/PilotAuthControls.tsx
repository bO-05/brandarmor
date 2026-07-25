"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function PilotAuthControls() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !isLoaded) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
      {isSignedIn ? (
        <>
          <span className="text-xs text-muted-foreground">Pilot account</span>
          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <button type="button" className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Sign in for pilot</button>
        </SignInButton>
      )}
    </div>
  );
}
