import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
        <section className="surface-card w-full rounded-lg p-6">
          <p className="text-xs font-semibold uppercase text-muted-foreground">BrandArmor pilot</p>
          <h1 className="mt-2 text-2xl font-bold">Authentication is not configured</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">The controlled demo remains read-only until the pilot administrator configures Clerk and workspace membership.</p>
        </section>
      </main>
    );
  }

  return <SignIn path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />;
}
