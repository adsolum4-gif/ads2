import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, MenuItem,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";
import { useAdminLiveRefresh } from "../live";

export default function Deposits() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(endpoints.DEPOSITS);
      const payload = unwrap(res);
      setRows(payload?.results || payload?.data || payload || []);
      setError(false);
    } catch { if (!silent) setError(true); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useAdminLiveRefresh(["deposit"], () => load(true));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(endpoints.DEPOSIT_STATUS(current.id), { status: form.status, admin_password: form.admin_password });
      toast.success("Deposit status updated.");
      setCurrent(null);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Deposits List" />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["#", "User", "Amount", "Status", "Date time", "Screenshot", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * per, page * per + per).map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{page * per + i + 1}</TableCell>
                <TableCell>{r.username || r.user?.username}</TableCell>
                <TableCell>{r.amount}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy h:mm a") : r.date}</TableCell>
                <TableCell>
                  {r.screenshot && <img src={r.screenshot} alt="Screenshot" className="object-cover h-12 cursor-pointer" onClick={() => setPreview(r.screenshot)} />}
                </TableCell>
                <TableCell>
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setCurrent(r); setForm({ status: r.status }); }}>See More</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={rows.length} page={page} rowsPerPage={per} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => setPer(+e.target.value)} />
      </TableContainer>

      <Dialog open={!!current} onClose={() => setCurrent(null)} fullWidth>
        <DialogTitle>Update Deposit Status</DialogTitle>
        <DialogContent className="space-y-3 mt-2">
          <p>User Name: {current?.username || current?.user?.username}</p>
          <p>Amount: {current?.amount}</p>
          <p>Status: {current?.status}</p>
          <p>Date: {current?.created_at}</p>
          {current?.screenshot && <img src={current.screenshot} alt="Deposit screenshot" className="w-full max-h-64 object-contain" />}
          <TextField select fullWidth label="Status" value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Cancelled">Cancel Deposit</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </TextField>
          <TextField fullWidth type="password" label="Administrator Password" value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCurrent(null)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Submit"}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!preview} onClose={() => setPreview(null)}>
        <DialogTitle>Screenshot Preview</DialogTitle>
        <DialogContent><img src={preview} alt="Screenshot Preview" className="w-full" /></DialogContent>
      </Dialog>
    </div>
  );
}
