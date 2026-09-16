import { useEffect, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Autocomplete,
} from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function NegativeUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [neg, all] = await Promise.all([api.get(endpoints.NEGATIVE_USERS), api.get(endpoints.USERS, { params: { page_size: 200 } })]);
      const n = unwrap(neg);
      const u = unwrap(all);
      setRows(n?.results || n?.data || n || []);
      setUsers(u?.results || u?.data || u || []);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (current) await api.patch(endpoints.NEGATIVE_USER(current.id), form);
      else await api.post(endpoints.NEGATIVE_USERS, form);
      toast.success(current ? "Updated successfully" : "Added successfully");
      setOpen(false);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Negative Users List" />
      <div className="flex gap-2 mb-4">
        <Button variant="contained" color="success" onClick={() => { setCurrent(null); setForm({}); setOpen(true); }}>Add Negative User</Button>
        <Button variant="contained" color="warning">Excel</Button>
        <Button variant="contained" color="info">Column visibility</Button>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Username", "Number of negative products", "Rank", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * per, page * per + per).map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{page * per + i + 1}</TableCell>
                <TableCell>{r.username || r.user?.username}</TableCell>
                <TableCell>{r.number_of_negative_products ?? r.count}</TableCell>
                <TableCell>{r.rank ?? r.rank_of_appearance}</TableCell>
                <TableCell>
                  <Button size="small" color="secondary" variant="contained" onClick={() => { setCurrent(r); setForm(r); setOpen(true); }}>Update</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={rows.length} page={page} rowsPerPage={per} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => setPer(+e.target.value)} />
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{current ? "Update User Details" : "Add Negative User"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <Autocomplete
            options={users}
            getOptionLabel={(o) => o.username || ""}
            onChange={(_, v) => setForm({ ...form, user_id: v?.id })}
            renderInput={(params) => <TextField {...params} label="Select a user" />}
          />
          <TextField label="Number of negative products (simultaneously)" type="number" value={form.number_of_negative_products || ""} onChange={(e) => setForm({ ...form, number_of_negative_products: e.target.value })} />
          <TextField label="Rank of appearance of the negative product" type="number" value={form.rank || form.rank_of_appearance || ""} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
