import { useEffect, useMemo, useState } from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

function productNumberFromName(name) {
  const m = String(name || "").match(/product\s*#?\s*(\d+)\s*$/i);
  return m ? Number(m[1]) : null;
}

function matchesProductSearch(row, query, listIndexOneBased) {
  const q = query.trim();
  const qLower = q.toLowerCase();
  if (!qLower) return true;

  const name = String(row.name || "");
  const nameLower = name.toLowerCase();
  const labelNo = productNumberFromName(name);

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    if (labelNo === n) return true;
    if (listIndexOneBased === n) return true;
    if (nameLower === `product ${n}` || nameLower === `product${n}`) return true;
    return false;
  }

  const productPhrase = q.match(/^product\s*#?\s*(\d+)$/i);
  if (productPhrase) {
    return labelNo === Number(productPhrase[1]);
  }

  const price = String(row.price ?? "");
  const id = String(row.id || "").toLowerCase();
  const rating = String(row.rating_number ?? row.rating_no ?? "");
  if (nameLower.includes(qLower)) return true;
  if (price.includes(q)) return true;
  if (id.includes(qLower)) return true;
  if (rating.includes(q)) return true;
  if (labelNo != null && String(labelNo).includes(q)) return true;
  return false;
}

export default function Products() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return rows;
    return rows.filter((r, i) => matchesProductSearch(r, q, i + 1));
  }, [rows, search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.PRODUCTS);
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
      ["name", "price", "rating_number"].forEach((k) => form[k] != null && body.append(k, form[k]));
      if (form.image instanceof File) body.append("image", form.image);
      if (mode === "add") {
        await api.post(endpoints.PRODUCTS, body);
        toast.success("Product added successfully");
      } else {
        await api.patch(endpoints.PRODUCT(form.id), body);
        toast.success("Product updated successfully");
      }
      setOpen(false);
      load();
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!confirm(`Confirm delete (${row.name})? Are you absolutely sure you want to continue with this action, as it cannot be reversed?`)) return;
    try {
      await api.delete(endpoints.PRODUCT(row.id));
      toast.success("Product deleted successfully");
      load();
    } catch (e) { showError(e); }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Products" />
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="contained" color="success" onClick={() => { setMode("add"); setForm({}); setOpen(true); }}>
          Add a Product
        </Button>
        <TextField
          size="small"
          label="Search products"
          placeholder="e.g. 61 or Product 61, name, price, ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full sm:max-w-md"
        />
        {search.trim() ? (
          <span className="text-sm text-gray-600">
            {filtered.length} of {rows.length} shown
          </span>
        ) : null}
      </div>
      <TableContainer component={Paper} className="mt-4">
        <Table>
          <TableHead>
            <TableRow>
              {["#", "Name", "Price", "Rating Number", "Created On", "Image", "Action"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {rows.length === 0 ? "No products yet." : "No products match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(page * per, page * per + per).map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{page * per + i + 1}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.price}</TableCell>
                <TableCell>{r.rating_number ?? r.rating_no}</TableCell>
                <TableCell>{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : ""}</TableCell>
                <TableCell>
                  <img src={r.image} alt={r.name} className="object-cover w-8 h-8 border rounded cursor-pointer" onClick={() => setPreview(r.image)} />
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button size="small" variant="contained" color="secondary" onClick={() => { setMode("update"); setForm(r); setOpen(true); }}>Update</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => remove(r)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={per} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setPer(+e.target.value); setPage(0); }} />
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{mode === "add" ? "Add a Product" : "Update Product"}</DialogTitle>
        <DialogContent className="grid grid-cols-2 gap-4 mt-2">
          <TextField label="Name" fullWidth value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Price" type="number" fullWidth value={form.price || ""} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Button variant="outlined" component="label">
            Choose File
            <input hidden type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
          </Button>
          {form.image ? <img src={typeof form.image === "string" ? form.image : URL.createObjectURL(form.image)} alt="Image" className="object-cover w-12 h-12 border rounded" /> : <span className="text-sm">No file chosen</span>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained">{saving ? <CircularProgress size={16} /> : mode === "add" ? "Save" : "Update"}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!preview} onClose={() => setPreview(null)}>
        <DialogTitle>Screenshot Preview</DialogTitle>
        <DialogContent><img src={preview} alt="Screenshot Preview" className="w-full" /></DialogContent>
      </Dialog>
    </div>
  );
}
