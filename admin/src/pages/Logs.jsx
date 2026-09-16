import { useEffect, useState } from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from "@mui/material";
import { format } from "date-fns";
import { api, unwrap } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function Logs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.LOGS);
      const payload = unwrap(res);
      setRows(payload?.results || payload?.data || payload || []);
      setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Logs" />
      <TextField size="small" placeholder="Search" className="mb-4" value={search} onChange={(e) => setSearch(e.target.value)} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {["#", "User", "Action", "Reason", "Created At"].map((h) => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * per, page * per + per).map((r, i) => (
              <TableRow key={r.id || i}>
                <TableCell>{page * per + i + 1}</TableCell>
                <TableCell>{r.username || r.admin || r.user}</TableCell>
                <TableCell>{r.action || r.message}</TableCell>
                <TableCell>{r.reason}</TableCell>
                <TableCell>{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy h:mm a") : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={per} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => setPer(+e.target.value)} />
      </TableContainer>
    </div>
  );
}
