import { useEffect, useState } from "react";

const API_URL = "https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag";

const FALLBACK = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "+27" },
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1" },
];

function toDial(country) {
  const root = country?.idd?.root || "";
  const suffixes = Array.isArray(country?.idd?.suffixes) ? country.idd.suffixes : [];
  if (!root) return "";
  if (suffixes.length === 1) return `${root}${suffixes[0]}`;
  return root;
}

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function buildInternationalPhone(dial, localNumber) {
  const local = digitsOnly(localNumber).replace(/^0+/, "");
  const code = String(dial || "").replace(/\s/g, "");
  if (!code || !local) return "";
  return `${code}${local}`;
}

export default function PhoneCountryInput({
  countryCode,
  onCountryChange,
  localNumber,
  onLocalNumberChange,
  required = false,
  className = "",
}) {
  const [countries, setCountries] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Failed to load countries");
        const rows = await res.json();
        const mapped = (Array.isArray(rows) ? rows : [])
          .map((row) => ({
            code: row.cca2,
            name: row.name?.common || row.cca2,
            flag: row.flag || "",
            dial: toDial(row),
          }))
          .filter((row) => row.code && row.dial)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled && mapped.length) setCountries(mapped);
      } catch {
        if (!cancelled) setCountries(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = countries.find((c) => c.code === countryCode) || countries.find((c) => c.code === "US") || countries[0];

  return (
    <div className="flex gap-2">
      <select
        value={selected?.code || ""}
        onChange={(e) => {
          const next = countries.find((c) => c.code === e.target.value);
          if (next) onCountryChange?.(next);
        }}
        required={required}
        disabled={loading}
        className={`${className.replace(/\bw-full\b/g, "")} w-[13.5rem] shrink-0`}
        aria-label="Country"
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.dial})
          </option>
        ))}
      </select>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name="phone_number"
          value={localNumber}
          onChange={(e) => onLocalNumberChange(digitsOnly(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            onLocalNumberChange(digitsOnly(e.clipboardData.getData("text")));
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const allowed = ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"];
            if (allowed.includes(e.key)) return;
            if (!/^\d$/.test(e.key)) e.preventDefault();
          }}
          placeholder="Phone number"
          required={required}
          className={`${className} flex-1 min-w-0`}
          pattern="[0-9]{6,15}"
          title="Enter digits only"
        />
    </div>
  );
}
