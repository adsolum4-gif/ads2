import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
} from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function Announcements() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({ is_active: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.ANNOUNCEMENTS);
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
      if (current) {
        await api.put(endpoints.ANNOUNCEMENT(current.id), form);
        toast.success("Announcement updated successfully");
      } else {
        await api.post(endpoints.ANNOUNCEMENTS, form);
        toast.success("Announcement added successfully");
      }
      setOpen(false);
      load();
    } catch (e) {
      showError(e, "Failed to save announcement. Please check your input.");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Are you absolutely sure you want to continue with this action, as it cannot be reversed?")) return;
    try {
      await api.delete(endpoints.ANNOUNCEMENT(id));
      toast.success("Announcement deleted successfully");
      load();
    } catch (e) { showError(e); }
  };

  const filtered = rows.filter((r) => (r.title || "").toLowerCase().includes(search.toLowerCase()));
  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Announcements List" />
      <div className="flex gap-2 mb-4">
        <TextField size="small" placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="contained" color="success" onClick={() => { setCurrent(null); setForm({ is_active: true }); setOpen(true); }}>Add Announcement</Button>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Title", "Message", "Start Date", "End Date", "Active", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell className="max-w-xs truncate">{r.message}</TableCell>
                <TableCell>{r.start_date}</TableCell>
                <TableCell>{r.end_date}</TableCell>
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
        <DialogTitle>{current ? "Update Announcement" : "Add an Announcement"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <TextField label="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Message" multiline minRows={4} placeholder="This message will be shown to users" value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <TextField label="Start Date" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <TextField label="End Date" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <label className="flex items-center gap-2">
            <Switch checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (show to users)
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
