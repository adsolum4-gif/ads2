import { useEffect, useState } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import { toast } from "sonner";
import { api, ensureAdminSession, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

const FIELDS = [
  ["percentage_of_sponsors", "Percentage of sponsors"],
  ["token_validity_period", "Token validity period in hours"],
  ["registration_bonus", "Bonus when registering in USD"],
  ["service_availability_start_time", "Service availability start time"],
  ["service_availability_end_time", "Service availability end time"],
  ["timezone", "Time Zone"],
  ["minimum_balance_for_submissions", "Minimum balance for submissions"],
  ["erc_address", "ETH address"],
  ["trc_address", "TRC20 address"],
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await ensureAdminSession();
      const res = await api.get(endpoints.SETTINGS);
      setForm(unwrap(res) || {});
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const session = await ensureAdminSession();
      if (!session) {
        toast.error("Session expired. Please log out and sign in again.");
        return;
      }
      await api.patch(endpoints.PATCH_SETTINGS, form);
      toast.success("Settings updated successfully");
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Settings Management" />
      <div className="grid grid-cols-1 gap-4 p-6 bg-white rounded-lg shadow md:grid-cols-2">
        {FIELDS.map(([key, label]) => (
          <TextField
            key={key}
            label={label}
            value={form[key] ?? ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            fullWidth
          />
        ))}
      </div>
      <Button className="mt-4" variant="contained" color="error" onClick={save} disabled={saving}>
        {saving ? <CircularProgress size={16} /> : "Save"}
      </Button>
    </div>
  );
}
