import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
} from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";
import { useAdminLiveRefresh } from "../live";

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function Holds() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rangesRes, holdsRes] = await Promise.all([
        api.get(endpoints.ON_HOLDS),
        api.get(endpoints.USER_HOLDS),
      ]);
      const rangesPayload = unwrap(rangesRes);
      const ranges = rangesPayload?.results
        || (Array.isArray(rangesPayload?.data) ? [] : rangesPayload?.data?.results)
        || [];
      setRows(Array.isArray(ranges) ? ranges : []);

      const holdsPayload = unwrap(holdsRes);
      const list = Array.isArray(holdsPayload)
        ? holdsPayload
        : holdsPayload?.users || holdsPayload?.results || holdsPayload?.data || [];
      setUsers(Array.isArray(list) ? list : []);
      setError(false);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  useAdminLiveRefresh(["user", "hold"], () => load(true));

  const save = async () => {
    setSaving(true);
    try {
      if (current) {
        await api.patch(endpoints.ON_HOLD(current.id), form);
        toast.success("Hold updated successfully");
      } else {
        await api.post(endpoints.ON_HOLDS, form);
        toast.success("Hold created successfully");
      }
      setOpen(false);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Are you absolutely sure you want to perform this action?")) return;
    try {
      await api.delete(endpoints.ON_HOLD(id));
      toast.success("Hold deleted successfully");
      load();
    } catch (e) { showError(e); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="On hold" />

      <h3 className="mb-3 text-lg font-semibold text-gray-800">User on hold</h3>
      <p className="mb-3 text-sm text-gray-500">
        Same on-hold amount each user sees on Starting. Use this to track what they actually see.
      </p>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Username", "Balance", "On hold"].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "text.secondary" }}>
                  No users currently have an on-hold amount.
                </TableCell>
              </TableRow>
            )}
            {users.map((u, i) => (
              <TableRow key={u.user_id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>${money(u.balance)}</TableCell>
                <TableCell sx={{ color: Number(u.on_hold) < 0 ? "#d32f2f" : "inherit", fontWeight: 600 }}>
                  ${money(u.on_hold)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <h3 className="mt-10 mb-3 text-lg font-semibold text-gray-800">Ranges of on hold</h3>
      <Button variant="contained" color="success" className="mb-4" onClick={() => { setCurrent(null); setForm({ is_active: true }); setOpen(true); }}>Add a range of on hold</Button>
      <TableContainer component={Paper} className="mt-4">
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Minimum Amount", "Maximum Amount", "Active", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.minimum_amount ?? r.min_amount}</TableCell>
                <TableCell>{r.maximum_amount ?? r.max_amount}</TableCell>
                <TableCell><Switch checked={!!r.is_active || !!r.active} disabled /></TableCell>
                <TableCell className="flex gap-2">
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setCurrent(r); setForm(r); setOpen(true); }}>Update</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => remove(r.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{current ? "Update a range of on hold" : "Add a range of on hold"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <TextField label="Minimum amount" type="number" value={form.minimum_amount || form.min_amount || ""} onChange={(e) => setForm({ ...form, minimum_amount: e.target.value })} />
          <TextField label="Maximum amount" type="number" value={form.maximum_amount || form.max_amount || ""} onChange={(e) => setForm({ ...form, maximum_amount: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
