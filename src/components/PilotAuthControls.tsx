"use client";

import { OrganizationSwitcher, SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function PilotAuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <PilotAuthLoadedControls />;
}

function PilotAuthLoadedControls() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      {isSignedIn ? (
        <div className="flex items-center justify-between gap-2">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      ) : (
        <SignInButton mode="modal">
          <button type="button" className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Sign in for pilot</button>
        </SignInButton>
      )}
    </div>
  );
}
