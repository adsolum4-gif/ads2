import { useEffect, useMemo, useState } from "react";
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

function rangeBounds(r) {
  const min = Number(r.minimum_amount ?? r.min_amount);
  const max = Number(r.maximum_amount ?? r.max_amount);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function holdMagnitude(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function inRange(amount, bounds) {
  return amount >= bounds.min && amount <= bounds.max;
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
  const [selectedRangeId, setSelectedRangeId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formMin = Number(form.minimum_amount ?? form.min_amount);
  const formMax = Number(form.maximum_amount ?? form.max_amount);
  const rangeError =
    Number.isFinite(formMin) && Number.isFinite(formMax) && formMax <= formMin
      ? "Maximum amount must be more than the minimum amount"
      : "";

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rangesRes, holdsRes] = await Promise.all([
        api.get(endpoints.ON_HOLDS),
        api.get(endpoints.USER_HOLDS),
      ]);
      const rangesPayload = unwrap(rangesRes);
      const ranges = rangesPayload?.results
        || rangesPayload?.data?.results
        || (Array.isArray(rangesPayload) ? rangesPayload : []);
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

  const activeRanges = useMemo(
    () => rows.filter((r) => r.is_active !== false && r.active !== false),
    [rows]
  );

  const filterRanges = useMemo(() => {
    if (selectedRangeId) {
      const picked = rows.find((r) => r.id === selectedRangeId);
      return picked ? [picked] : activeRanges;
    }
    return activeRanges;
  }, [activeRanges, rows, selectedRangeId]);

  const filteredUsers = useMemo(() => {
    const bounds = filterRanges.map(rangeBounds).filter(Boolean);
    if (!bounds.length) return users;
    return users.filter((u) => bounds.some((b) => inRange(holdMagnitude(u.on_hold), b)));
  }, [users, filterRanges]);

  const save = async () => {
    const min = Number(form.minimum_amount ?? form.min_amount);
    const max = Number(form.maximum_amount ?? form.max_amount);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      toast.error("Enter both a minimum and maximum amount.");
      return;
    }
    if (max <= min) {
      toast.error("Maximum amount must be more than the minimum amount.");
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, minimum_amount: min, maximum_amount: max };
      if (current) {
        await api.patch(endpoints.ON_HOLD(current.id), body);
        toast.success("Hold updated successfully");
      } else {
        await api.post(endpoints.ON_HOLDS, body);
        toast.success("Hold created successfully");
      }
      setOpen(false);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!toDelete?.id) return;
    setDeleting(true);
    try {
      await api.delete(endpoints.ON_HOLD(toDelete.id));
      toast.success("Hold deleted successfully");
      if (selectedRangeId === toDelete.id) setSelectedRangeId(null);
      setToDelete(null);
      load();
    } catch (e) { showError(e); }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="On hold" />

      <h3 className="mb-3 text-lg font-semibold text-gray-800">User on hold</h3>
      <p className="mb-3 text-sm text-gray-500">
        Filtered by the min–max ranges below (on-hold amount). Click a range to show only that band, or use all active ranges.
      </p>
      {selectedRangeId && (
        <Button size="small" className="mb-3" onClick={() => setSelectedRangeId(null)}>
          Show all matching ranges
        </Button>
      )}
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
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "text.secondary" }}>
                  {users.length === 0
                    ? "No users currently have an on-hold amount."
                    : "No users match the selected on-hold range(s)."}
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map((u, i) => (
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
              <TableRow
                key={r.id}
                hover
                selected={selectedRangeId === r.id}
                onClick={() => setSelectedRangeId((id) => (id === r.id ? null : r.id))}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.minimum_amount ?? r.min_amount}</TableCell>
                <TableCell>{r.maximum_amount ?? r.max_amount}</TableCell>
                <TableCell><Switch checked={!!r.is_active || !!r.active} disabled /></TableCell>
                <TableCell className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setCurrent(r); setForm(r); setOpen(true); }}>Update</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => setToDelete(r)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{current ? "Update a range of on hold" : "Add a range of on hold"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <TextField
            label="Minimum on-hold amount"
            type="number"
            value={form.minimum_amount ?? form.min_amount ?? ""}
            onChange={(e) => setForm({ ...form, minimum_amount: e.target.value })}
            error={!!rangeError}
            helperText={rangeError || "Users whose on-hold amount is at least this value"}
          />
          <TextField
            label="Maximum on-hold amount"
            type="number"
            value={form.maximum_amount ?? form.max_amount ?? ""}
            onChange={(e) => setForm({ ...form, maximum_amount: e.target.value })}
            error={!!rangeError}
            helperText={rangeError || "Must be more than the minimum amount"}
          />
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active !== false} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span className="text-sm text-gray-700">Use this range as a filter</span>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained" disabled={!!rangeError || saving}>{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)} fullWidth>
        <DialogTitle>Delete this range?</DialogTitle>
        <DialogContent>
          <p className="mt-2 text-sm text-gray-700">
            This will remove the on-hold range
            {toDelete
              ? ` $${money(toDelete.minimum_amount ?? toDelete.min_amount)}–$${money(toDelete.maximum_amount ?? toDelete.max_amount)}`
              : ""}
            . This cannot be undone.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={remove} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
