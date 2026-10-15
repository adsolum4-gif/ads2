import ALL_COUNTRIES from "@shared/phoneCountries.json";
import { useMemo } from "react";

const COUNTRIES = [...ALL_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

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
  const countries = useMemo(() => COUNTRIES, []);

  const selected =
    countries.find((c) => c.code === countryCode) ||
    countries.find((c) => c.code === "US") ||
    countries[0];

  return (
    <div className="flex gap-2">
      <select
        value={selected?.code || ""}
        onChange={(e) => {
          const next = countries.find((c) => c.code === e.target.value);
          if (next) onCountryChange?.(next);
        }}
        required={required}
        className={`${className.replace(/\bw-full\b/g, "")} w-[13.5rem] shrink-0 max-h-12`}
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
