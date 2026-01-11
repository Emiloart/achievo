"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "../auth/AdminSessionProvider";
import * as adminApi from "../../lib/adminApi";

const searchTargets = [
  { value: "org", label: "Org" },
  { value: "user", label: "User" },
  { value: "username", label: "Username" },
];

export function TopBar() {
  const router = useRouter();
  const { admin, setAdmin } = useAdminSession();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("org");

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    if (target === "org") router.push(`/orgs?q=${encodeURIComponent(query.trim())}`);
    if (target === "user") router.push(`/users?q=${encodeURIComponent(query.trim())}`);
    if (target === "username") router.push(`/usernames?q=${encodeURIComponent(query.trim())}`);
  };

  const onLogout = async () => {
    await adminApi.logout();
    setAdmin(null);
    router.replace("/login");
  };

  return (
    <header className="top-bar">
      <form onSubmit={onSearch} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
          {searchTargets.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Search by id, handle, or address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn secondary" type="submit">
          Search
        </button>
      </form>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="muted" style={{ fontSize: "13px" }}>
          {admin?.email} · {admin?.role}
        </div>
        <button className="btn ghost" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
