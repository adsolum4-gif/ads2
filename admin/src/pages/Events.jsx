import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.EVENTS);
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
      if (file) body.append("image", file);
      if (current) {
        await api.put(endpoints.EVENT(current.id), body);
        toast.success("Event updated successfully");
      } else {
        await api.post(endpoints.EVENTS, body);
        toast.success("Event added successfully");
      }
      setOpen(false);
      setFile(null);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Are you absolutely sure you want to continue with this action, as it cannot be reversed?")) return;
    try {
      await api.delete(endpoints.EVENT(id));
      toast.success("Event deleted successfully");
      load();
    } catch (e) { showError(e); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Events List" />
      <Button variant="contained" color="success" onClick={() => { setCurrent(null); setFile(null); setOpen(true); }}>Add an Event</Button>
      <TableContainer component={Paper} className="mt-4">
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Picture", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell><img src={r.image} alt="event" className="object-contain h-20" /></TableCell>
                <TableCell className="flex gap-2">
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setCurrent(r); setOpen(true); }}>Update</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => remove(r.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{current ? "Update Event" : "Add an Event"}</DialogTitle>
        <DialogContent>
          <Button variant="outlined" component="label" className="mt-4">
            Choose Image
            <input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          </Button>
          {(file || current?.image) && <img src={file ? URL.createObjectURL(file) : current.image} alt="Preview" className="object-contain w-full mt-4 max-h-64" />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
