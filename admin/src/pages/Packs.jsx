import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
} from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function Packs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.PACKS);
      const payload = unwrap(res);
      setRows(payload?.results || payload?.data || payload || []);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v != null) body.append(k, v); });
      if (current) {
        await api.patch(endpoints.PACK(current.id), body);
        toast.success("Pack updated successfully");
      } else {
        await api.post(endpoints.PACKS, body);
        toast.success("Pack added successfully");
      }
      setOpen(false);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Packages List" />
      <Button variant="contained" color="success" onClick={() => { setCurrent(null); setForm({}); setOpen(true); }}>Add a Package</Button>
      <TableContainer component={Paper} className="mt-4">
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Icon", "Name", "Usd value", "Daily missions", "Daily withdrawals", "Short Description", "Active", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <img src={r.icon || `/assets/vip/vip-${Math.min(8, Math.max(1, parseInt(String(r.name).replace(/\D/g, ""), 10) || 1))}.svg`} alt={r.name} className="w-10 h-10 object-contain" />
                </TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.usd_value}</TableCell>
                <TableCell>{r.daily_missions}</TableCell>
                <TableCell>{r.daily_withdrawals}</TableCell>
                <TableCell>{r.short_description}</TableCell>
                <TableCell><Switch checked={!!r.is_active || !!r.active} disabled /></TableCell>
                <TableCell>
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setCurrent(r); setForm(r); setOpen(true); }}>Update</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{current ? "Update Package" : "Add a Package"}</DialogTitle>
        <DialogContent className="grid grid-cols-2 gap-4 mt-2">
          <TextField label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Usd Value" type="number" value={form.usd_value || ""} onChange={(e) => setForm({ ...form, usd_value: e.target.value })} />
          <TextField label="Extra Bonus (USD)" type="number" value={form.payment_bonus || form.extra_bonus || ""} onChange={(e) => setForm({ ...form, payment_bonus: e.target.value })} />
          <TextField label="Payment Amount to Unlock Bonus" type="number" value={form.payment_to_unlock_bonus || ""} onChange={(e) => setForm({ ...form, payment_to_unlock_bonus: e.target.value })} />
          <TextField label="Daily Missions" type="number" value={form.daily_missions || ""} onChange={(e) => setForm({ ...form, daily_missions: e.target.value })} />
          <TextField label="Daily Withdrawals" type="number" value={form.daily_withdrawals || ""} onChange={(e) => setForm({ ...form, daily_withdrawals: e.target.value })} />
          <TextField label="Number of Set" type="number" value={form.number_of_set || ""} onChange={(e) => setForm({ ...form, number_of_set: e.target.value })} />
          <TextField label="Profit Percentage" type="number" value={form.profit_percentage || ""} onChange={(e) => setForm({ ...form, profit_percentage: e.target.value })} />
          <TextField className="col-span-2" label="Short Description" value={form.short_description || ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          <TextField className="col-span-2" label="Description" multiline value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button variant="outlined" component="label">
            Choose File
            <input hidden type="file" accept="image/*" onChange={(e) => setForm({ ...form, icon: e.target.files[0] })} />
          </Button>
          <span className="text-sm">{form.icon?.name || (typeof form.icon === "string" ? "Current icon" : "No file chosen")}</span>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Submitting"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
