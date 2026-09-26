"use client";

import type { ReactNode } from "react";
import type { NdaData, Party } from "@/lib/nda";

interface NdaFormProps {
  data: NdaData;
  /** The date shown when the user has not picked one (today). */
  defaultDate: string;
  onChange: (data: NdaData) => void;
}

const boxClass =
  "rounded-[3px] border border-rule bg-paper text-[0.9375rem] text-type placeholder:text-muted focus:border-ink";
const inputClass = `${boxClass} w-full px-3 py-2`;

export default function NdaForm({ data, defaultDate, onChange }: NdaFormProps) {
  const set = <K extends keyof NdaData>(key: K, value: NdaData[K]) => onChange({ ...data, [key]: value });
  const setParty = (index: 0 | 1, key: keyof Party, value: string) => {
    const parties: NdaData["parties"] = [...data.parties];
    parties[index] = { ...parties[index], [key]: value };
    set("parties", parties);
  };

  return (
    <form className="space-y-9" onSubmit={(e) => e.preventDefault()}>
      <Section title="The agreement">
        <Field label="Purpose" hint="How each side may use what the other shares.">
          <textarea rows={3} className={inputClass} value={data.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </Field>
        <Field label="Effective date">
          <input
            type="date"
            className={inputClass}
            value={data.effectiveDate || defaultDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </Field>
        <Field label="Governing law" hint="The state whose laws apply.">
          <input className={inputClass} placeholder="Delaware" value={data.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} />
        </Field>
        <Field label="Jurisdiction" hint="Where disputes are heard.">
          <input
            className={inputClass}
            placeholder="courts located in New Castle, DE"
            value={data.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="How long it lasts">
        <Choice
          legend="The agreement itself"
          name="mndaTerm"
          value={data.mndaTerm}
          onChange={(value) => set("mndaTerm", value)}
          options={[
            {
              value: "expires",
              label: (
                <YearsLabel
                  prefix="Expires after"
                  years={data.mndaTermYears}
                  onChange={(years) => onChange({ ...data, mndaTerm: "expires", mndaTermYears: years })}
                />
              ),
            },
            { value: "untilTerminated", label: "Continues until either party ends it" },
          ]}
        />
        <Choice
          legend="Protection of confidential information"
          name="confidentialityTerm"
          value={data.confidentialityTerm}
          onChange={(value) => set("confidentialityTerm", value)}
          options={[
            {
              value: "years",
              label: (
                <YearsLabel
                  prefix="Lasts for"
                  years={data.confidentialityYears}
                  onChange={(years) => onChange({ ...data, confidentialityTerm: "years", confidentialityYears: years })}
                />
              ),
            },
            { value: "perpetual", label: "Lasts forever" },
          ]}
        />
        <p className="text-[0.8125rem] leading-snug text-muted">Trade secrets stay protected for as long as they remain trade secrets.</p>
      </Section>

      {([0, 1] as const).map((index) => (
        <Section key={index} title={`Party ${index + 1}`}>
          <Field label="Company">
            <input className={inputClass} value={data.parties[index].company} onChange={(e) => setParty(index, "company", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field label="Signer’s name">
              <input className={inputClass} value={data.parties[index].name} onChange={(e) => setParty(index, "name", e.target.value)} />
            </Field>
            <Field label="Signer’s title">
              <input className={inputClass} value={data.parties[index].title} onChange={(e) => setParty(index, "title", e.target.value)} />
            </Field>
          </div>
          <Field label="Notice address" hint="Email or postal address for formal notices.">
            <textarea
              rows={2}
              className={inputClass}
              value={data.parties[index].noticeAddress}
              onChange={(e) => setParty(index, "noticeAddress", e.target.value)}
            />
          </Field>
        </Section>
      ))}

      <Section title="Changes to the standard terms">
        <Field label="Modifications" hint="Leave empty to use the Common Paper standard terms as written.">
          <textarea rows={3} className={inputClass} value={data.modifications} onChange={(e) => set("modifications", e.target.value)} />
        </Field>
      </Section>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 w-full border-b border-rule pb-2 text-[0.9375rem] font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-9 items-center gap-2.5 text-[0.9375rem]">
            <input
              type="radio"
              name={name}
              className="size-4 accent-ink"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** "Expires after [n] years": editing the number also selects its option. */
function YearsLabel({ prefix, years, onChange }: { prefix: string; years: string; onChange: (years: string) => void }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      {prefix}
      <input
        type="number"
        min={1}
        max={99}
        aria-label={`${prefix}: number of years`}
        className={`${boxClass} w-16 px-2 py-1 text-center`}
        value={years}
        onChange={(e) => onChange(e.target.value)}
      />
      {Number(years) === 1 ? "year" : "years"}
    </span>
  );
}
