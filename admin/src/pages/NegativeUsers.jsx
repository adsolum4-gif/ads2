import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Autocomplete,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import { MdMoreVert } from "react-icons/md";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";
import { useAdminLiveRefresh } from "../live";
import { NEGATIVE_RANGES, vipLevelFromPack, maxRankOfAppearance, remainingAppearances } from "@shared/negativeRanges";

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function lastSeen(value) {
  if (!value) return "Never";
  try {
    return format(new Date(value), "dd MMM yyyy h:mm a");
  } catch {
    return "Never";
  }
}

function digitsOnly(value) {
  const cleaned = String(value ?? "").replace(/\D/g, "");
  return cleaned === "" ? "" : Number(cleaned);
}

const emptyForm = {
  user_id: "",
  range_min: "",
  range_max: "",
  number_of_negative_products: 4,
  rank: 4,
};

export default function NegativeUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(10);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [moneyDialog, setMoneyDialog] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [neg, all] = await Promise.all([
        api.get(endpoints.NEGATIVE_USERS),
        api.get(endpoints.USERS, { params: { page_size: 200 } }),
      ]);
      const n = unwrap(neg);
      const u = unwrap(all);
      setRows(n?.results || n?.data || n || []);
      setUsers(u?.results || u?.data || u || []);
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

  const selectedUser = users.find((u) => u.id === form.user_id) || null;
  const selectedRange = NEGATIVE_RANGES.find((r) => r.min === Number(form.range_min) && r.max === Number(form.range_max)) || null;
  const selectedPack = selectedUser?.wallet?.package || selectedUser?.wallet?.packs;
  const selectedLevel = vipLevelFromPack(selectedPack);
  const vipRankCap = maxRankOfAppearance(selectedLevel);
  const doneToday = Number(selectedUser?.current_number_count ?? 0);
  const totalToday = Number(selectedUser?.total_number_can_play ?? 0);
  const leftToday = selectedUser ? remainingAppearances(selectedUser) : null;

  const save = async () => {
    if (!form.user_id) return toast.error("Select a user.");
    if (!form.range_min || !form.range_max) return toast.error("Select a penalty range.");
    const products = Number(form.number_of_negative_products);
    const rank = Number(form.rank);
    if (!Number.isInteger(products) || products < 1) {
      return toast.error("Number of negative products must be a whole number of at least 1.");
    }
    if (!Number.isInteger(rank) || rank < 1) {
      return toast.error("Rank of appearance must be a whole number of at least 1.");
    }
    if (rank < products) {
      return toast.error("Rank of appearance must be equal to or more than the number of negative products.");
    }
    if (rank > vipRankCap) {
      return toast.error(`Rank of appearance cannot exceed ${vipRankCap} for VIP ${selectedLevel}.`);
    }
    if (leftToday != null && leftToday < 1) {
      return toast.error("This user has no product appearances left today.");
    }
    if (leftToday != null && (rank > leftToday || products > leftToday)) {
      return toast.error(`This user has ${leftToday} appearances left today. Rank and negative products cannot be higher than that.`);
    }
    setSaving(true);
    try {
      const body = {
        user_id: form.user_id,
        range_min: form.range_min,
        range_max: form.range_max,
        number_of_negative_products: form.number_of_negative_products,
        rank: form.rank,
      };
      if (current) await api.patch(endpoints.NEGATIVE_USER(current.id), body);
      else await api.post(endpoints.NEGATIVE_USERS, body);
      toast.success(current ? "Negative user updated." : "Negative user added. On hold will increase by one share after each ranked appearance.");
      setOpen(false);
      setCurrent(null);
      load();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      if (confirm.type === "toggle") {
        await api.post(endpoints.TOGGLE_NEGATIVE(confirm.row.id), { is_active: confirm.next });
        toast.success(confirm.next ? "Negative penalty is on again." : "Negative penalty removed. On-hold from this penalty was cleared.");
      } else if (confirm.type === "delete") {
        await api.delete(endpoints.NEGATIVE_USER(confirm.row.id));
        toast.success("Negative user deleted.");
      }
      setConfirm(null);
      load();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const saveMoney = async () => {
    if (!moneyDialog) return;
    setSaving(true);
    try {
      const url = moneyDialog.type === "profit" ? endpoints.UPDATE_PROFIT : endpoints.UPDATE_SALARY;
      await api.post(url, {
        user_id: moneyDialog.row.user_id,
        amount: moneyDialog.amount,
        reason: moneyDialog.reason,
      });
      toast.success(moneyDialog.type === "profit" ? "Today's profit updated." : "Salary updated.");
      setMoneyDialog(null);
      load();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ["Username", "Negative", "Negative products", "Rank", "Balance", "Today submissions", "Today profit", "Last connected", "On hold balance"];
    const lines = [header.join(",")].concat(
      filtered.map((r) =>
        [
          r.username,
          r.is_negative ? "Yes" : "No",
          r.number_of_negative_products,
          r.rank,
          r.balance,
          `${r.current_number_count ?? 0}/${r.total_number_can_play ?? 0}`,
          r.today_profit,
          lastSeen(r.last_connection),
          r.on_hold_balance ?? r.on_hold,
        ]
          .map((v) => JSON.stringify(v ?? ""))
          .join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "negative-users.csv";
    a.click();
  };

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      query
        ? rows.filter((r) => (r.username || "").toLowerCase().includes(query))
        : rows,
    [rows, query]
  );

  const openAdd = () => {
    setCurrent(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setCurrent(row);
    setForm({
      user_id: row.user_id,
      range_min: row.range_min || "",
      range_max: row.range_max || "",
      number_of_negative_products: row.number_of_negative_products || 1,
      rank: row.rank || 1,
    });
    setOpen(true);
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  const pageRows = filtered.slice(page * per, page * per + per);

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Negative Users List" />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="contained" color="success" onClick={openAdd}>Add Negative User</Button>
        <Button variant="contained" color="warning" onClick={exportCsv}>Excel</Button>
        <TextField
          variant="outlined"
          placeholder="Search users"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ ml: { xs: 0, md: "auto" }, minWidth: { xs: "100%", md: 260 } }}
        />
      </div>

      <div className="hidden lg:block">
        <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Username", "Negative", "Number of negative products", "Rank of appearance set", "Balance", "Today's submission", "Today's profit", "Last connected", "On hold balance", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.username || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.is_negative !== false}
                      color="error"
                      onChange={() =>
                        setConfirm({
                          type: "toggle",
                          row: r,
                          next: !(r.is_negative !== false),
                          title: r.is_negative !== false ? "Turn off negative penalty?" : "Turn on negative penalty?",
                          body:
                            r.is_negative !== false
                              ? `This will clear ${r.username}'s on-hold penalty. Their actual wallet balance will stay the same.`
                              : `This will turn the penalty back on. On hold will increase by one share after each ranked appearance. Their actual wallet balance will stay the same.`,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>{r.number_of_negative_products}</TableCell>
                  <TableCell>{r.rank}</TableCell>
                  <TableCell sx={{ color: Number(r.balance) < 0 ? "#d32f2f" : "inherit", fontWeight: 600 }}>
                    ${money(r.balance)}
                  </TableCell>
                  <TableCell>{r.current_number_count ?? 0}/{r.total_number_can_play ?? 0}</TableCell>
                  <TableCell>${money(r.today_profit)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{lastSeen(r.last_connection)}</TableCell>
                  <TableCell sx={{ color: Number(r.on_hold_balance ?? r.on_hold) < 0 ? "#d32f2f" : "inherit", fontWeight: 600 }}>
                    ${money(r.on_hold_balance ?? r.on_hold)}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(r)}
                      onDelete={() =>
                        setConfirm({
                          type: "delete",
                          row: r,
                          title: "Delete negative user?",
                          body: `Remove ${r.username} from the negative record and clear their on-hold penalty. Their actual wallet balance will stay the same.`,
                        })
                      }
                      onProfit={() => setMoneyDialog({ type: "profit", row: r, amount: r.today_profit ?? "", reason: "" })}
                      onSalary={() => setMoneyDialog({ type: "salary", row: r, amount: r.salary ?? "", reason: "" })}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!pageRows.length && (
                <TableRow>
                  <TableCell colSpan={10} align="center">No matching users on the negative record.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            rowsPerPage={per}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setPer(+e.target.value);
              setPage(0);
            }}
          />
        </TableContainer>
      </div>

      <div className="lg:hidden space-y-3">
        {pageRows.map((r) => (
          <article key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Username</p>
                <h3 className="text-lg font-bold text-gray-800">{r.username || "—"}</h3>
              </div>
              <div className="flex items-center gap-1">
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Negative</p>
                  <Switch
                    checked={r.is_negative !== false}
                    color="error"
                    onChange={() =>
                      setConfirm({
                        type: "toggle",
                        row: r,
                        next: !(r.is_negative !== false),
                        title: r.is_negative !== false ? "Turn off negative penalty?" : "Turn on negative penalty?",
                        body:
                          r.is_negative !== false
                          ? `This will clear ${r.username}'s on-hold penalty. Their actual wallet balance will stay the same.`
                          : `This will turn the penalty back on. On hold will increase by one share after each ranked appearance. Their actual wallet balance will stay the same.`,
                      })
                    }
                  />
                </div>
                <RowActions
                  onEdit={() => openEdit(r)}
                  onDelete={() =>
                    setConfirm({
                      type: "delete",
                      row: r,
                      title: "Delete negative user?",
                      body: `Remove ${r.username} from the negative record and clear their on-hold penalty. Their actual wallet balance will stay the same.`,
                    })
                  }
                  onProfit={() => setMoneyDialog({ type: "profit", row: r, amount: r.today_profit ?? "", reason: "" })}
                  onSalary={() => setMoneyDialog({ type: "salary", row: r, amount: r.salary ?? "", reason: "" })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <Stat label="Negative products" value={r.number_of_negative_products} />
              <Stat label="Rank of appearance" value={r.rank} />
              <Stat label="Balance" value={`$${money(r.balance)}`} danger={Number(r.balance) < 0} />
              <Stat label="Today's submission" value={`${r.current_number_count ?? 0}/${r.total_number_can_play ?? 0}`} />
              <Stat label="Today's profit" value={`$${money(r.today_profit)}`} />
              <Stat label="On hold balance" value={`$${money(r.on_hold_balance ?? r.on_hold)}`} danger={Number(r.on_hold_balance ?? r.on_hold) < 0} />
            </div>
            <p className="text-xs text-gray-500 mt-3">Last connected: {lastSeen(r.last_connection)}</p>
          </article>
        ))}
        {!pageRows.length && (
          <p className="text-center text-gray-500 py-8">No matching users on the negative record.</p>
        )}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={per}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPer(+e.target.value);
            setPage(0);
          }}
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{current ? "Edit negative user" : "Add Negative User"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <Autocomplete
            options={users}
            value={selectedUser}
            getOptionLabel={(o) => o.username || ""}
            onChange={(_, v) => setForm({ ...form, user_id: v?.id || "" })}
            disabled={!!current}
            renderInput={(params) => <TextField {...params} label="Username" placeholder="Search and select a user" />}
          />
          <TextField
            select
            fullWidth
            label="Select range"
            value={selectedRange ? `${selectedRange.min}-${selectedRange.max}` : ""}
            onChange={(e) => {
              const next = NEGATIVE_RANGES.find((r) => `${r.min}-${r.max}` === e.target.value);
              setForm({ ...form, range_min: next?.min || "", range_max: next?.max || "" });
            }}
          >
            {NEGATIVE_RANGES.map((r) => (
              <MenuItem key={r.label} value={`${r.min}-${r.max}`}>${r.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Number of negative products"
            type="text"
            inputMode="numeric"
            value={form.number_of_negative_products}
            onChange={(e) => setForm({ ...form, number_of_negative_products: digitsOnly(e.target.value) })}
            helperText="Whole number only. Rank of appearance must be equal to or more than this. Range amount is split across these products."
          />
          <TextField
            label="Rank of appearance"
            type="text"
            inputMode="numeric"
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: digitsOnly(e.target.value) })}
            helperText={
              selectedUser
                ? `Must be equal to or more than negative products. VIP ${selectedLevel} max is ${vipRankCap}. Window starts after ${doneToday}/${totalToday || "\u2014"}.`
                : "Must be equal to or more than the number of negative products. Max grows by 10 each VIP level (VIP 3 = 50)."
            }
          />
          {selectedUser && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p>
                <strong>{selectedUser.username}</strong> is VIP {selectedLevel}. Completed {doneToday}/{totalToday} tasks today.
              </p>
              <p className="mt-1">
                <strong>{leftToday}</strong> product appearances left today. Rank cannot exceed {Math.min(vipRankCap, leftToday)}.
              </p>
              <p className="mt-1 text-amber-900">
                From {doneToday}/{totalToday || 0}, rank {form.rank || "\u2014"} sets the window starting at task {doneToday + 1}
                {form.rank ? ` through ${doneToday + Number(form.rank)}` : ""}. Each of the {form.number_of_negative_products || "N"} appearances adds one share of the range to on hold. The full range amount only shows after the last appearance.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="warning" variant="outlined">Close</Button>
          <Button onClick={save} variant="contained" disabled={saving}>{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <p className="mt-2 text-gray-700">{confirm?.body}</p>
          <p className="mt-3 font-medium">Are you sure you want to perform this action?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} color="warning" variant="outlined">Close</Button>
          <Button onClick={runConfirm} color="error" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={16} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!moneyDialog} onClose={() => setMoneyDialog(null)} fullWidth>
        <DialogTitle>{moneyDialog?.type === "profit" ? "Update today's profit" : "Update salary"}</DialogTitle>
        <DialogContent className="grid gap-4 mt-2">
          <TextField label="User" fullWidth disabled value={moneyDialog?.row?.username || ""} />
          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={moneyDialog?.amount ?? ""}
            onChange={(e) => setMoneyDialog({ ...moneyDialog, amount: e.target.value })}
          />
          <TextField
            label="Reason"
            fullWidth
            value={moneyDialog?.reason ?? ""}
            onChange={(e) => setMoneyDialog({ ...moneyDialog, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoneyDialog(null)} color="warning" variant="outlined">Close</Button>
          <Button onClick={saveMoney} variant="contained" disabled={saving}>{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className={`font-bold mt-0.5 ${danger ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

function RowActions({ onEdit, onDelete, onProfit, onSalary }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const pick = (fn) => () => {
    close();
    fn();
  };
  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Actions">
        <MdMoreVert className="text-xl" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={pick(onEdit)}>Edit</MenuItem>
        <MenuItem onClick={pick(onProfit)}>Update today's profit</MenuItem>
        <MenuItem onClick={pick(onSalary)}>Update salary</MenuItem>
        <MenuItem onClick={pick(onDelete)} sx={{ color: "error.main" }}>Delete</MenuItem>
      </Menu>
    </>
  );
}
