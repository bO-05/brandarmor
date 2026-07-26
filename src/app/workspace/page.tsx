"use client";

import { OrganizationProfile, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  if (!isLoaded) return <div className="p-6">Loading workspace…</div>;
  if (!isSignedIn) return <div className="p-6"><p>Sign in to manage a pilot workspace.</p><Link className="mt-3 inline-block text-primary" href="/">Return to workspace</Link></div>;
  if (!orgId) return <div className="p-6"><p>Select or create a Clerk Organization from the workspace switcher before managing members.</p><Link className="mt-3 inline-block text-primary" href="/">Return to workspace</Link></div>;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Workspace members</h1>
      <p className="mb-5 text-sm text-muted-foreground">Admins can invite a reviewer to this Clerk Organization. Invited members can switch into the shared BrandArmor workspace after accepting the invitation.</p>
      <OrganizationProfile />
    </div>
  );
}
