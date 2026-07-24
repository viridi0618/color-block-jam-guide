"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export function LevelSearch({ approvedLevels }: { approvedLevels: number[] }) {
  const router = useRouter();
  const approved = useMemo(() => new Set(approvedLevels), [approvedLevels]);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const levelId = Number(value);
    if (!Number.isInteger(levelId) || levelId <= 0) {
      setMessage("Enter a valid level number.");
      return;
    }
    if (!approved.has(levelId)) {
      setMessage(`We don't have a walkthrough for Level ${levelId} yet.`);
      return;
    }
    setMessage("");
    router.push(`/level/${levelId}`);
  }

  return (
    <form className="level-search" onSubmit={submit} noValidate>
      <div className="search-row">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Level number</span>
          <input value={value} onChange={(event) => { setValue(event.target.value.replace(/\D/g, "")); setMessage(""); }} inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="Enter your level number" aria-describedby="level-search-message" />
        </label>
        <button className="primary-button" type="submit">Find My Level</button>
      </div>
      <p id="level-search-message" className="search-message" role="status" aria-live="polite">{message}</p>
    </form>
  );
}
