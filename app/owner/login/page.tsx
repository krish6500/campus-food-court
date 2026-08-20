import Link from "next/link";
import { redirect } from "next/navigation";
import { hasOwnerCredentials, isOwnerAuthenticated } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isOwnerAuthenticated()) {
    redirect("/owner");
  }

  const params = await searchParams;
  const hasError = params?.error === "1";
  const isConfigured = hasOwnerCredentials();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 text-zinc-950">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
          Private owner access
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Owner login</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Sign in to manage menu items and customer orders.
        </p>

        {!isConfigured ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            Set OWNER_USERNAME, OWNER_PASSWORD, and OWNER_SESSION_SECRET in
            Vercel before using the owner page.
          </div>
        ) : null}

        <form action="/api/owner/login" className="mt-5 space-y-4" method="post">
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="username">
              Username
            </label>
            <input
              autoComplete="username"
              className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="username"
              name="username"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>

          <button
            className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={!isConfigured}
            type="submit"
          >
            Login
          </button>
        </form>

        {hasError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            Wrong owner username or password.
          </div>
        ) : null}

        <Link
          className="mt-5 inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-bold text-zinc-700 hover:border-zinc-500"
          href="/"
        >
          Customer view
        </Link>
      </section>
    </main>
  );
}
