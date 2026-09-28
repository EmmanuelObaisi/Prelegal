"use client";

import { useState, type FormEvent, type ReactNode } from "react";

/**
 * Placeholder sign-in screen. Any email and password let the user in; nothing
 * is verified or stored, so a page reload signs them out again.
 */
export default function SignInGate({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);

  if (signedIn) return children;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignedIn(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-md border-t-4 border-accent bg-paper p-8 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-semibold text-navy">Sign in to Prelegal</h1>
          <p className="text-sm text-gray-text">Draft common legal agreements in minutes.</p>
        </div>

        <Field label="Email" type="email" autoComplete="email" />
        <Field label="Password" type="password" autoComplete="current-password" />

        <button
          type="submit"
          className="w-full rounded-[3px] bg-brand-purple px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

function Field({ label, type, autoComplete }: { label: string; type: string; autoComplete: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-navy">
      <span>{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        required
        className="block w-full rounded-[3px] border border-rule px-3 py-2 font-normal text-type focus:border-brand-blue"
      />
    </label>
  );
}
