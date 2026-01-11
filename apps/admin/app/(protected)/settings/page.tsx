"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { useAdminSession } from "../../../components/auth/AdminSessionProvider";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";

const roles = ["VIEWER", "OPERATOR", "ADMIN", "SUPERADMIN"];

export default function SettingsPage() {
  const { admin } = useAdminSession();
  const [users, setUsers] = useState<any[]>([]);
  const [env, setEnv] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");

  const [selectedId, setSelectedId] = useState("");
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [selectedActive, setSelectedActive] = useState(true);
  const [selectedPassword, setSelectedPassword] = useState("");

  const load = async () => {
    try {
      const [users, env] = await Promise.all([adminApi.adminUsers(), adminApi.envSummary()]);
      setUsers(users);
      setEnv(env);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (admin?.role === "SUPERADMIN") {
      void load();
    }
  }, [admin?.role]);

  if (admin?.role !== "SUPERADMIN") {
    return <div className="card">Superadmin role required to manage admin users.</div>;
  }

  const selectedUser = users.find((user) => user.id === selectedId);

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedRole(selectedUser.role);
    setSelectedActive(Boolean(selectedUser.isActive));
  }, [selectedUser]);

  return (
    <div className="stack">
      <div className="card">
        <h3>Environment summary</h3>
        <pre className="code">{JSON.stringify(env, null, 2)}</pre>
      </div>

      <div className="card">
        <h3>Admin users</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} onClick={() => setSelectedId(user.id)} style={{ cursor: "pointer" }}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No admin users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Create admin user</h3>
          <div className="stack">
            <div className="field">
              <label className="muted">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label className="muted">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="muted">Role</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <TwoStepAction
          title="Create admin user"
          action="admin_user_create"
          payload={{ email, password, role }}
          onComplete={load}
        />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Update admin user</h3>
          <div className="stack">
            <div className="field">
              <label className="muted">Selected user</label>
              <div className="code">{selectedUser?.email || "Select a user"}</div>
            </div>
            <div className="field">
              <label className="muted">Role</label>
              <select
                className="select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="muted">Active</label>
              <select
                className="select"
                value={String(selectedActive)}
                onChange={(e) => setSelectedActive(e.target.value === "true")}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label className="muted">Reset password (optional)</label>
              <input
                className="input"
                type="password"
                value={selectedPassword}
                onChange={(e) => setSelectedPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
        <TwoStepAction
          title="Update admin user"
          action="admin_user_update"
          payload={{
            id: selectedId,
            role: selectedRole,
            isActive: selectedActive,
            password: selectedPassword || undefined,
          }}
          onComplete={load}
        />
      </div>
    </div>
  );
}
