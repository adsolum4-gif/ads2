import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { format } from "date-fns";
import { toast } from "sonner";
import { MdContentCopy, MdLink, MdVpnKey } from "react-icons/md";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

function userAppUrl() {
  const env = import.meta.env.VITE_USER_APP_URL;
  if (env) return env.replace(/\/+$/, "");
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:5173";
  return "https://www.adsterra-opt.com";
}

function copyText(value, label) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Could not copy")
  );
}

export default function Refer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [links, setLinks] = useState([]);
  const [codes, setCodes] = useState([]);
  const [savingLink, setSavingLink] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [latestCode, setLatestCode] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.REFERRALS);
      const payload = unwrap(res);
      setLinks(payload?.links || []);
      setCodes(payload?.codes || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeLink = useMemo(() => links.find((row) => !row.used_by) || null, [links]);
  const specialUrl = activeLink ? `${userAppUrl()}/signup-otp?ref=${activeLink.token}` : "";

  const createSpecialLink = async () => {
    setSavingLink(true);
    try {
      await api.post(endpoints.SPECIAL_LINK);
      toast.success("Special referral link created.");
      await load();
    } catch (e) {
      showError(e);
    } finally {
      setSavingLink(false);
    }
  };

  const generateCode = async () => {
    setSavingCode(true);
    try {
      const res = await api.post(endpoints.GENERATE_CODE);
      const payload = unwrap(res);
      const code = payload?.code || "";
      setLatestCode(code);
      if (code) copyText(code, "Invitation code");
      toast.success("4-digit invitation code generated.");
      await load();
    } catch (e) {
      showError(e);
    } finally {
      setSavingCode(false);
    }
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  return (
    <div className="p-2 md:p-6 space-y-6">
      <PageHeader title="Refer" />

      <Paper className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <MdLink className="text-2xl text-red-600 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Special referral link</h2>
            <p className="text-sm text-gray-600 mt-1 max-w-3xl">
              The first user to register with this link will not need an invitation code. After they sign up, an invitation code is created and sent to them in Notifications so they can invite other people.
            </p>
          </div>
        </div>
        {specialUrl ? (
          <div className="flex flex-col md:flex-row gap-2 mt-4">
            <TextField size="small" fullWidth value={specialUrl} InputProps={{ readOnly: true }} />
            <Button variant="contained" startIcon={<MdContentCopy />} onClick={() => copyText(specialUrl, "Referral link")}>
              Copy link
            </Button>
          </div>
        ) : (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mt-3">
            No unused special link right now. Generate one to refer the next first user.
          </p>
        )}
        <Button
          className="mt-4"
          sx={{ mt: 2 }}
          variant={specialUrl ? "outlined" : "contained"}
          color="error"
          disabled={savingLink}
          onClick={createSpecialLink}
        >
          {savingLink && <CircularProgress size={16} className="mr-2" />}
          {specialUrl ? "Generate a new special link" : "Generate special link"}
        </Button>
        {links.length > 0 && (
          <TableContainer className="mt-4">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Token", "Status", "Used by", "Created"].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {links.slice(0, 8).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.token}</TableCell>
                    <TableCell>{row.used_by ? "Used" : "Open — first user free"}</TableCell>
                    <TableCell>{row.used_username || "—"}</TableCell>
                    <TableCell>{row.created_at ? format(new Date(row.created_at), "dd MMM yyyy h:mm a") : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <MdVpnKey className="text-2xl text-red-600 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Generate invitation code</h2>
            <p className="text-sm text-gray-600 mt-1">
              Creates a 4-digit invitation code. Share this code with users who are not using the special first-user link. The registration form defaults to <strong>0000</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Button variant="contained" color="success" disabled={savingCode} onClick={generateCode}>
            {savingCode && <CircularProgress size={16} className="mr-2" />}
            Generate 4-digit code
          </Button>
          {latestCode && (
            <button
              type="button"
              onClick={() => copyText(latestCode, "Invitation code")}
              className="px-4 py-2 rounded-md bg-gray-100 font-mono text-lg tracking-[0.3em] font-semibold"
            >
              {latestCode}
            </button>
          )}
        </div>
        <TableContainer className="mt-4">
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Code", "Reusable", "Used", "Created"].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {codes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-semibold">{row.code}</TableCell>
                  <TableCell>{row.reusable ? "Yes" : "No"}</TableCell>
                  <TableCell>{row.used_by ? "Yes" : "No"}</TableCell>
                  <TableCell>{row.created_at ? format(new Date(row.created_at), "dd MMM yyyy h:mm a") : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
