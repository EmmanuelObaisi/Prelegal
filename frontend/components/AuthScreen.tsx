"use client";

import { useId, useState, type FormEvent } from "react";
import Logo from "@/components/Logo";
import { signIn, signUp, type User } from "@/lib/auth";

type Mode = "signIn" | "signUp";

const COPY = {
  signIn: {
    heading: "Sign in to Prelegal",
    intro: "Welcome back. Pick up where you left off.",
    submit: "Sign in",
    switchPrompt: "New to Prelegal?",
    switchAction: "Create an account",
  },
  signUp: {
    heading: "Create your account",
    intro: "Draft your first agreement in minutes.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
  },
};

const HIGHLIGHTS = [
  "11 Common Paper agreements, from NDAs to cloud service terms",
  "Chat with an AI assistant that fills in the details for you",
  "Every draft is saved, so you can come back to it",
];

/** Sign in or create an account. Calls `onSignedIn` once the session cookie is set. */
export default function AuthScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };
    setWorking(true);
    setError("");
    try {
      onSignedIn(await (mode === "signIn" ? signIn : signUp)(credentials));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Try again.");
      setWorking(false);
    }
  }

  function switchMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setError("");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      <section className="hidden flex-col justify-between bg-navy p-12 text-paper lg:flex">
        <Logo inverted />
        <div className="max-w-md space-y-6">
          <p className="font-serif text-4xl leading-tight font-semibold">Legal agreements, drafted in a conversation.</p>
          <ul className="space-y-3 text-[0.9375rem] text-paper/80">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-paper/60">Drafts are subject to legal review before signing.</p>
      </section>

      <section className="flex items-center justify-center bg-paper px-4 py-12 sm:px-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-navy">{copy.heading}</h1>
            <p className="text-sm text-gray-text">{copy.intro}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email" name="email" type="email" autoComplete="email" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              minLength={8}
              hint={mode === "signUp" ? "At least 8 characters." : undefined}
            />
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={working}
              className="w-full rounded-md bg-brand-purple px-4 py-2.5 text-sm font-semibold text-paper shadow-sm hover:bg-brand-purple/90 disabled:cursor-wait disabled:opacity-70"
            >
              {working ? "Please wait…" : copy.submit}
            </button>
          </form>

          <p className="text-center text-sm text-gray-text">
            {copy.switchPrompt}{" "}
            <button type="button" onClick={switchMode} className="font-semibold text-brand-blue hover:underline">
              {copy.switchAction}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}

function Field({ label, hint, ...input }: FieldProps) {
  const hintId = useId();
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5 text-sm font-medium text-navy">
        <span>{label}</span>
        <input
          {...input}
          required
          aria-describedby={hint && hintId}
          className="block w-full rounded-md border border-rule px-3 py-2 font-normal text-type shadow-sm focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none"
        />
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-gray-text">
          {hint}
        </p>
      )}
    </div>
  );
}
