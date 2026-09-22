import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  CircularProgress,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import { MdContentCopy, MdAccountCircle } from "react-icons/md";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";
import { useAdminLiveRefresh } from "../live";

export default function AllUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(5);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("No filter");
  const [expanded, setExpanded] = useState({});
  const [menu, setMenu] = useState(null);
  const [current, setCurrent] = useState(null);
  const [invite, setInvite] = useState("");
  const [inviting, setInviting] = useState(false);
  const [hidden, setHidden] = useState([]);
  const [colAnchor, setColAnchor] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(null);
  const [packs, setPacks] = useState([]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const params = { page: page + 1, page_size: rows, search };
      if (order && order !== "No filter") params.ordering = order;
      const res = await api.get(endpoints.USERS, { params });
      const payload = unwrap(res);
      const list = payload?.results || payload?.data || payload || [];
      setUsers(Array.isArray(list) ? list : []);
      setCount(payload?.count || payload?.pagination?.count || (Array.isArray(list) ? list.length : 0));
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [page, rows, order, search]);
  useEffect(() => {
    api.get(endpoints.PACKS).then((res) => {
      const payload = unwrap(res);
      const list = payload?.results || payload?.data || payload || [];
      setPacks(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);
  useAdminLiveRefresh(["user"], () => load(true));

  const cols = useMemo(
    () => [
      { Header: "#", accessorKey: "id" },
      { Header: "Username", accessorKey: "username" },
      { Header: "Phone No", accessorKey: "phone_number" },
      { Header: "Gender", accessorKey: "gender" },
      { Header: "Balance", accessorKey: "balance" },
      { Header: "Referral Code", accessorKey: "referral_code" },
      { Header: "Image", accessorKey: "profile_picture" },
      { Header: "Today's submission total", accessorKey: "todaySubmission" },
      { Header: "Today's profit", accessorKey: "todayProfit" },
      { Header: "Total Submission Set", accessorKey: "submissionSet" },
    ],
    []
  );

  const rowsView = users.map((u) => {
    const pack = u.wallet?.package || u.wallet?.packs || {};
    const done = Number(u.current_number_count ?? 0);
    const total = Number(u.total_number_can_play ?? 0);
    const setTotal = Number(pack.number_of_set ?? 0);
    const setDone = Number(u.current_set ?? u.total_sets_completed ?? 0);
    return {
      ...u,
      balance: Number(u.wallet?.balance ?? u.balance ?? 0).toFixed(2),
      onHold: u.wallet?.on_hold,
      gender: u.gender === "M" ? "Male" : u.gender === "F" ? "Female" : u.gender || "",
      referral_code: u.referral_code || "",
      todaySubmission: `${done}/${total}`,
      todayProfit: Number(u.today_profit ?? 0).toFixed(2),
      submissionSet: `${setDone}/${setTotal}`,
    };
  });

  const generateCode = async () => {
    setInviting(true);
    try {
      const res = await api.post(endpoints.GENERATE_CODE);
      const payload = unwrap(res);
      const code = String(payload?.code || payload?.invitation_code || "").trim();
      if (!code) throw new Error("No invitation code was returned.");
      setInvite(code);
      try {
        await navigator.clipboard.writeText(code);
        toast.success(`Invitation code ${code} generated. It can only be used once.`);
      } catch {
        toast.success(`Invitation code ${code} generated. It can only be used once. Copy it now.`);
      }
    } catch (e) {
      showError(e);
    } finally {
      setInviting(false);
    }
  };

  const postAction = async (url, body) => {
    setSaving(true);
    try {
      await api.post(url, body);
      toast.success("Updated successfully");
      setDialog(null);
      load();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      await api.post(endpoints.TOGGLE_ACTIVE, { user_id: id });
      load();
    } catch (e) {
      showError(e);
    }
  };

  const exportCsv = () => {
    const header = cols.filter((c) => c.accessorKey !== "actions" && c.accessorKey !== "profile_picture").map((c) => c.Header);
    const lines = [header.join(",")].concat(
      rowsView.map((u) => header.map((_, i) => JSON.stringify(u[cols[i + 1]?.accessorKey] ?? "")).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "users.csv";
    a.click();
  };

  const openMenu = (e, user) => {
    setMenu(e.currentTarget);
    setCurrent(user);
  };

  if (loading && !users.length) return <LoadingBar />;
  if (error && !users.length) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Users List" />
      <div className="grid justify-start grid-cols-2 gap-2 mb-4 md:flex md:flex-wrap md:items-center">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Sort By Order</InputLabel>
          <Select value={order} label="Sort By Order" onChange={(e) => setOrder(e.target.value)}>
            <MenuItem value="No filter">No filter</MenuItem>
            <MenuItem value="-wallet_commission">Highest income</MenuItem>
            <MenuItem value="-total_games_played">Total products submitted descending</MenuItem>
            <MenuItem value="-total_negative_product">Total negative products descending</MenuItem>
          </Select>
        </FormControl>
        <Button className="h-10" variant="contained" color="success" size="small" onClick={() => { setDialog("create"); setForm({ gender: "M", password: "Team@123" }); }}>
          Add user
        </Button>
        <Button className="h-10" variant="contained" color="error" size="small" onClick={() => window.print()}>Export PDF</Button>
        <Button className="h-10 mr-4" variant="contained" color="info" size="small" onClick={(e) => setColAnchor(e.currentTarget)}>Column Visibility</Button>
        <Menu anchorEl={colAnchor} open={!!colAnchor} onClose={() => setColAnchor(null)}>
          {cols.filter((c) => c.accessorKey !== "actions").map((c) => (
            <MenuItem key={c.accessorKey} onClick={() => setHidden((h) => (h.includes(c.accessorKey) ? h.filter((x) => x !== c.accessorKey) : [...h, c.accessorKey]))}>
              {c.Header}
            </MenuItem>
          ))}
        </Menu>
        <TextField
          variant="outlined"
          placeholder="Search username, phone, email..."
          size="small"
          style={{ marginLeft: "auto", minWidth: 220 }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              load();
            }
          }}
        />
        <Button onClick={generateCode} color="success" variant="contained" disabled={inviting} style={{ textTransform: "none" }}>
          {inviting && <CircularProgress size={16} className="mr-2" />} Generate an invitation code
        </Button>
        {invite && (
          <Button
            color="primary"
            variant="outlined"
            onClick={() => {
              navigator.clipboard.writeText(invite);
              toast.success("Copied");
            }}
            style={{ textTransform: "none" }}
            startIcon={<MdContentCopy />}
          >
            {invite}
          </Button>
        )}
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {cols.filter((c) => !hidden.includes(c.accessorKey)).map((c) => (
                <TableCell key={c.accessorKey} sx={{ fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" }}>
                  {c.accessorKey === "id" ? (
                    <TableSortLabel active direction="asc">{c.Header}</TableSortLabel>
                  ) : (
                    c.Header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsView.map((u, i) => (
              <Fragment key={u.id}>
                <TableRow hover>
                  {!hidden.includes("id") && (
                    <TableCell style={{ width: 70 }}>
                      <div className="flex items-center">
                        <Button size="small" onClick={() => setExpanded((e) => ({ ...e, [u.id]: !e[u.id] }))} style={{ minWidth: 24, padding: 0, fontSize: 18, lineHeight: 1 }}>
                          {expanded[u.id] ? "−" : "+"}
                        </Button>
                        <span className="ml-1">{page * rows + i + 1}</span>
                      </div>
                    </TableCell>
                  )}
                  {!hidden.includes("username") && <TableCell>{u.username}</TableCell>}
                  {!hidden.includes("phone_number") && <TableCell sx={{ whiteSpace: "nowrap" }}>{u.phone_number || "—"}</TableCell>}
                  {!hidden.includes("gender") && <TableCell>{u.gender || "—"}</TableCell>}
                  {!hidden.includes("balance") && <TableCell>{u.balance}</TableCell>}
                  {!hidden.includes("referral_code") && <TableCell>{u.referral_code || "—"}</TableCell>}
                  {!hidden.includes("profile_picture") && (
                    <TableCell>
                      {u.profile_picture ? (
                        <button type="button" onClick={() => setPreview({ src: u.profile_picture, name: u.username })} className="block">
                          <img src={u.profile_picture} alt={u.username} className="object-cover w-10 h-10 rounded-md cursor-pointer hover:opacity-90" />
                        </button>
                      ) : (
                        <MdAccountCircle className="text-4xl text-gray-400" />
                      )}
                    </TableCell>
                  )}
                  {!hidden.includes("todaySubmission") && <TableCell>{u.todaySubmission}</TableCell>}
                  {!hidden.includes("todayProfit") && <TableCell>{u.todayProfit}</TableCell>}
                  {!hidden.includes("submissionSet") && <TableCell>{u.submissionSet}</TableCell>}
                </TableRow>
                <TableRow>
                  <TableCell colSpan={10} style={{ padding: 0 }}>
                    <Collapse in={!!expanded[u.id]}>
                      <div className="p-4 bg-gray-50">
                        <p><strong>Email:</strong> {u.email || "—"}</p>
                        <p><strong>On hold balance:</strong> {u.wallet?.on_hold}</p>
                        <p><strong>Total products submitted:</strong> {u.total_product_submitted ?? u.total_games_played}</p>
                        <p><strong>Total negative products submitted:</strong> {u.total_negative_product_submitted}</p>
                        <p><strong>Total wallet commission:</strong> {u.wallet?.commission}</p>
                        <p><strong>Salary:</strong> {u.wallet?.salary}</p>
                        <p><strong>Level:</strong> {u.wallet?.package?.name}</p>
                        <p><strong>Missions:</strong> {u.current_number_count ?? 0} / {u.total_number_can_play ?? 0}</p>
                        <p><strong>Last connection:</strong> {u.last_connection ? format(new Date(u.last_connection), "dd MMM yyyy h:mm a") : "N/A"}</p>
                        <p className="flex items-center gap-2">
                          <strong>Active:</strong>
                          <input type="checkbox" checked={!!u.active || !!u.is_active} onChange={() => toggleActive(u.id)} />
                        </p>
                        <Button size="small" variant="contained" color="secondary" className="mt-2" onClick={(e) => openMenu(e, u)}>Unroll</Button>
                      </div>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={count} page={page} rowsPerPage={rows} onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRows(+e.target.value); setPage(0); }} rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="Rows per page:" />
      </TableContainer>

      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setDialog("package"); setForm({ package_id: current?.wallet?.package?.id || current?.wallet?.package_id || "" }); setMenu(null); }}>Assign VIP level</MenuItem>
        <MenuItem onClick={() => { setDialog("missions"); setForm({ total_number_can_play: current?.total_number_can_play, current_number_count: current?.current_number_count }); setMenu(null); }}>Update missions</MenuItem>
        <MenuItem onClick={() => { setDialog("hold"); setForm({ amount: current?.wallet?.on_hold }); setMenu(null); }}>Update on hold</MenuItem>
        <MenuItem onClick={() => { setDialog("login"); setForm({}); setMenu(null); }}>Reset login password</MenuItem>
        <MenuItem onClick={() => { setDialog("withdraw"); setForm({}); setMenu(null); }}>Update withdrawal password</MenuItem>
        <MenuItem onClick={() => { setDialog("balance"); setForm({}); setMenu(null); }}>Update customer balance</MenuItem>
        <MenuItem onClick={() => { setDialog("profit"); setForm({}); setMenu(null); }}>Update Today’s profit</MenuItem>
        <MenuItem onClick={() => { setDialog("salary"); setForm({}); setMenu(null); }}>Update salary</MenuItem>
        <MenuItem onClick={() => { setDialog("credit"); setForm({ credit_score: current?.wallet?.credit_score }); setMenu(null); }}>Update Credit Score</MenuItem>
        <MenuItem onClick={() => { setDialog("reset"); setMenu(null); }}>Reset account to start a new task</MenuItem>
        <MenuItem onClick={async () => {
          setMenu(null);
          try {
            const res = await api.post(endpoints.USER_INFO, { user_id: current.id });
            setInfo(unwrap(res));
          } catch (e) { showError(e); }
        }}>See more information</MenuItem>
        <MenuItem onClick={() => postAction(endpoints.TOGGLE_REG_BONUS, { user_id: current.id })}>
          {current?.is_reg_balance_add ? "Remove" : "Add"} registration bonus
        </MenuItem>
        <MenuItem onClick={() => postAction(endpoints.TOGGLE_MIN_BALANCE, { user_id: current.id })}>
          {current?.is_min_balance_for_submission_removed ? "Enable" : "Disable"} minimum balance for submissions
        </MenuItem>
        <MenuItem sx={{ color: "error.main" }} onClick={() => { setDialog("delete"); setMenu(null); }}>Delete User</MenuItem>
      </Menu>

      <ActionDialog open={dialog === "create"} title="Add user (no email required)" onClose={() => setDialog(null)} saving={saving} saveLabel={saving ? "Creating..." : "Create user"} onSave={() => {
        if (!form.username || !form.email || !form.password) return toast.error("Username, email, and password are required");
        postAction(endpoints.CREATE_USER, {
          username: form.username,
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          gender: form.gender,
        });
      }}>
        <TextField label="Username" fullWidth value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <TextField label="Email" fullWidth value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField label="Password" type="password" fullWidth value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <TextField label="First name" fullWidth value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <TextField label="Last name" fullWidth value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <TextField label="Phone" fullWidth value={form.phone_number || ""} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
        <TextField select fullWidth label="Gender" value={form.gender || "M"} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <MenuItem value="M">Male</MenuItem>
          <MenuItem value="F">Female</MenuItem>
        </TextField>
      </ActionDialog>

      <ActionDialog open={dialog === "package"} title="Assign VIP level" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_PACKAGE, { user_id: current.id, package_id: form.package_id })}>
        <TextField label="User" fullWidth disabled value={current?.username || ""} />
        <TextField select fullWidth label="VIP pack" value={form.package_id || ""} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
          {packs.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name} — ${p.usd_value}</MenuItem>
          ))}
        </TextField>
      </ActionDialog>

      <ActionDialog open={dialog === "missions"} title="Update missions" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_MISSIONS, { user_id: current.id, total_number_can_play: form.total_number_can_play, current_number_count: form.current_number_count })}>
        <TextField label="Completed today" type="number" fullWidth value={form.current_number_count ?? ""} onChange={(e) => setForm({ ...form, current_number_count: e.target.value })} />
        <TextField label="Daily mission limit" type="number" fullWidth value={form.total_number_can_play ?? ""} onChange={(e) => setForm({ ...form, total_number_can_play: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "hold"} title="Update on hold" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_ON_HOLD, { user_id: current.id, amount: form.amount, reason: form.reason })}>
        <TextField label="Current on hold" fullWidth disabled value={current?.wallet?.on_hold ?? ""} />
        <TextField label="Amount" type="number" fullWidth value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <TextField label="Reason" fullWidth value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "login"} title="Reset Login Password" onClose={() => setDialog(null)} saving={saving} saveLabel={saving ? "Resetting..." : "Reset password"} onSave={() => {
        if (!form.password || !form.confirm) return toast.error("Enter and confirm the new password");
        if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
        if (form.password !== form.confirm) return toast.error("Passwords do not match");
        if (!form.admin_password) return toast.error("Administrator password is required");
        postAction(endpoints.UPDATE_LOGIN_PASSWORD, { user_id: current.id, password: form.password, admin_password: form.admin_password });
      }}>
        <TextField label="User" fullWidth disabled value={current?.username || ""} />
        <TextField label="New password" type="password" fullWidth value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <TextField label="Confirm password" type="password" fullWidth value={form.confirm || ""} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "withdraw"} title="Update Withdrawal Password" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_WITHDRAWAL_PASSWORD, { user_id: current.id, password: form.password, admin_password: form.admin_password })}>
        <TextField label="User" fullWidth disabled value={current?.username || ""} />
        <TextField label="Withdrawal password" type="password" fullWidth value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <TextField label="Confirm withdrawal password" type="password" fullWidth value={form.confirm || ""} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "balance"} title="Update Customer Balance" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_BALANCE, { user_id: current.id, amount: form.amount, reason: form.reason, admin_password: form.admin_password })}>
        <TextField label="Current Customer Balance" fullWidth disabled value={current?.wallet?.balance ?? ""} />
        <TextField label="Amount" type="number" fullWidth value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <TextField label="Reason for change" fullWidth value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "profit"} title="Update Customer Today’s profit" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_PROFIT, { user_id: current.id, amount: form.amount, reason: form.reason, admin_password: form.admin_password })}>
        <TextField label="Current customer today's profit" fullWidth disabled value={current?.today_profit ?? current?.wallet?.commission ?? ""} />
        <TextField label="Amount" type="number" fullWidth value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <TextField label="Reason for change" fullWidth value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "salary"} title="Update customer salary" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_SALARY, { user_id: current.id, amount: form.amount, reason: form.reason, admin_password: form.admin_password })}>
        <TextField label="Current salary" fullWidth disabled value={current?.wallet?.salary ?? ""} />
        <TextField label="Amount" type="number" fullWidth value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <TextField label="Reason for change" fullWidth value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "credit"} title="Customer Credit Score" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.UPDATE_CREDIT, { user_id: current.id, credit_score: form.credit_score, admin_password: form.admin_password })}>
        <TextField label="Customer Credit Score" type="number" fullWidth value={form.credit_score || ""} onChange={(e) => setForm({ ...form, credit_score: e.target.value })} />
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "reset"} title="Reset customer account" onClose={() => setDialog(null)} saving={saving} onSave={() => postAction(endpoints.RESET_ACCOUNT, { user_id: current.id, admin_password: form.admin_password })}>
        <p>Are you absolutely sure you want to proceed with this action, as it cannot be reversed?</p>
        <TextField label="Administrator password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
      </ActionDialog>

      <ActionDialog open={dialog === "delete"} title="Delete User" onClose={() => setDialog(null)} saving={saving} saveLabel={saving ? "Deleting..." : "Confirm"} onSave={() => postAction(endpoints.DELETE_USER, { user_id: current.id, admin_password: form.admin_password, reason: form.reason })}>
        <p>You are about to delete user: <strong>{current?.username}</strong></p>
        <p>This will permanently delete the user and all associated data including:</p>
        <TextField label="Admin Password" type="password" fullWidth value={form.admin_password || ""} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
        <TextField label="Reason for deletion (optional)" fullWidth multiline value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Enter reason for deleting this user..." />
      </ActionDialog>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md">
        <DialogTitle>{preview?.name || "Profile image"}</DialogTitle>
        <DialogContent className="flex justify-center bg-black/90 p-2">
          {preview?.src && (
            <img src={preview.src} alt={preview.name || "Profile"} className="max-h-[80vh] max-w-full object-contain" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!info} onClose={() => setInfo(null)} fullWidth maxWidth="sm">
        <DialogTitle>User Information</DialogTitle>
        <DialogContent>
          {info && (
            <div className="space-y-2 mt-2">
              <p><strong>Username:</strong> {info.username}</p>
              <p><strong>Full name:</strong> {info.first_name} {info.last_name}</p>
              <p><strong>TRC address:</strong> {info.trc_address || info.wallet_address}</p>
              <p><strong>TRC phone:</strong> {info.phone_number}</p>
              <p><strong>Exchange:</strong> {info.exchange}</p>
              <p><strong>Email address:</strong> {info.email}</p>
              <p><strong>Referral Code:</strong> {info.referral_code}</p>
              <p><strong>VIP:</strong> {info.package_name || "N/A"}</p>
              <p><strong>Balance:</strong> {info.balance}</p>
              <p><strong>Missions:</strong> {info.current_number_count ?? 0} / {info.total_number_can_play ?? 0}</p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfo(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function ActionDialog({ open, title, onClose, onSave, saving, children, saveLabel = "Save" }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">{children}</div>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} color="warning" variant="outlined">Close</Button>
        <Button disabled={saving} onClick={onSave} color="primary" variant="contained">
          {saving && <CircularProgress size={16} />} {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
