import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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

export default function ClearOnHold() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [clearing, setClearing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(endpoints.USER_HOLDS);
      const payload = unwrap(res);
      const list = Array.isArray(payload) ? payload : payload?.users || payload?.results || payload?.data || [];
      setRows(Array.isArray(list) ? list : []);
      setError(false);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAdminLiveRefresh(["user", "hold"], () => load(true));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.username || "").toLowerCase().includes(q));
  }, [rows, search]);

  const runClear = async () => {
    if (!confirm?.user_id) return;
    setClearing(true);
    try {
      const res = await api.post(endpoints.CLEAR_USER_ON_HOLD, { user_id: confirm.user_id });
      const data = unwrap(res) || res?.data?.data || res?.data;
      toast.success(
        data?.username
          ? `Cleared on-hold for ${data.username} (was $${money(data.previous_on_hold)}).`
          : "On-hold balance cleared."
      );
      setConfirm(null);
      load(true);
    } catch (e) {
      showError(e);
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Clear on-hold balances" />
      <p className="text-sm text-gray-600 mb-4 max-w-3xl">
        Users with a non-zero on-hold amount. Clearing resets wallet on-hold to $0, clears negative-user hold flags, and removes any pending optimization task.
      </p>
      <TextField
        size="small"
        label="Search username"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm"
      />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Username", "Wallet balance", "On hold", "Action"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  {rows.length === 0 ? "No users currently have an on-hold balance." : "No users match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.username || "—"}</TableCell>
                  <TableCell>${money(r.balance)}</TableCell>
                  <TableCell
                    sx={{
                      color: Number(r.on_hold) < 0 ? "#d32f2f" : Number(r.on_hold) > 0 ? "#ed6c02" : "inherit",
                      fontWeight: 600,
                    }}
                  >
                    ${money(r.on_hold)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="warning"
                      variant="contained"
                      onClick={() =>
                        setConfirm({
                          user_id: r.user_id,
                          username: r.username,
                          on_hold: r.on_hold,
                        })
                      }
                    >
                      Clear to $0
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!confirm} onClose={() => !clearing && setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Clear on-hold balance?</DialogTitle>
        <DialogContent>
          <p className="text-gray-700 mt-2">
            Reset <strong>{confirm?.username}</strong>&apos;s on-hold from{" "}
            <strong>${money(confirm?.on_hold)}</strong> to <strong>$0.00</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Wallet balance is unchanged. Any pending special task for this user will be removed so they can start fresh.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} disabled={clearing}>
            Cancel
          </Button>
          <Button onClick={runClear} color="warning" variant="contained" disabled={clearing}>
            {clearing ? <CircularProgress size={18} color="inherit" /> : "Clear on-hold"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
