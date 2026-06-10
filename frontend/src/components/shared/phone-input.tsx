"use client";

import { useState } from "react";

const COUNTRIES = [
  { code: "+234", countryCode: "NG", name: "Nigeria" },
  { code: "+233", countryCode: "GH", name: "Ghana" },
  { code: "+254", countryCode: "KE", name: "Kenya" },
  { code: "+27", countryCode: "ZA", name: "South Africa" },
  { code: "+256", countryCode: "UG", name: "Uganda" },
  { code: "+255", countryCode: "TZ", name: "Tanzania" },
  { code: "+250", countryCode: "RW", name: "Rwanda" },
  { code: "+260", countryCode: "ZM", name: "Zambia" },
  { code: "+263", countryCode: "ZW", name: "Zimbabwe" },
  { code: "+265", countryCode: "MW", name: "Malawi" },
  { code: "+1", countryCode: "US", name: "USA/Canada" },
  { code: "+44", countryCode: "GB", name: "UK" },
  { code: "+49", countryCode: "DE", name: "Germany" },
  { code: "+33", countryCode: "FR", name: "France" },
  { code: "+61", countryCode: "AU", name: "Australia" },
  { code: "+91", countryCode: "IN", name: "India" },
  { code: "+86", countryCode: "CN", name: "China" },
  { code: "+55", countryCode: "BR", name: "Brazil" },
  { code: "+81", countryCode: "JP", name: "Japan" },
  { code: "+971", countryCode: "AE", name: "UAE" },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function PhoneInput({ value, onChange, placeholder = "Phone number", required, className = "" }: Props) {
  const [selected, setSelected] = useState(COUNTRIES[0]);

  const displayValue = value.startsWith(selected.code) ? value.slice(selected.code.length) : value;

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const codeDigits = selected.code.replace(/\D/g, "");
    const num = raw.startsWith(codeDigits) ? raw.slice(codeDigits.length) : raw;
    onChange(`${selected.code}${num}`);
  };

  return (
    <div className={`flex rounded-lg border border-input bg-background overflow-hidden ${className}`}>
      <select
        value={selected.code}
        onChange={(e) => {
          const country = COUNTRIES.find((c) => c.code === e.target.value) || COUNTRIES[0];
          setSelected(country);
          const num = value.replace(selected.code, "");
          onChange(`${country.code}${num}`);
        }}
        className="flex-shrink-0 border-r border-input bg-background px-2 py-2 text-sm outline-none"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.countryCode} {c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={displayValue}
        onChange={handleNumberChange}
        placeholder={placeholder}
        required={required}
        className="flex-1 bg-transparent px-3 py-2 text-sm outline-none min-w-0"
      />
    </div>
  );
}
