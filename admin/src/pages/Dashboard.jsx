import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
} from "@mui/material";
import { format } from "date-fns";
import { api, unwrap } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar, FetchError } from "../components/PageHeader";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(5);
  const [sort, setSort] = useState({ key: "id", direction: "asc" });

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(endpoints.GET_ADMIN);
      const payload = unwrap(res);
      setData(payload?.dashboard || payload);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const users = useMemo(() => {
    const list = data?.total_users_login_today?.users || [];
    return list.map((u, i) => ({
      ...u,
      id: i + 1,
      submitted: u.total_negative_product_submitted ?? u.number_of_negative_product,
      balance: u.wallet?.balance,
      submissionTotal: `${u.total_play}/${u.total_available_play}`,
      profit: u.wallet?.commission,
      connection: u.last_connection ? format(new Date(u.last_connection), "dd MM yyyy h:mma") : "",
      onHold: u.wallet?.on_hold,
    }));
  }, [data]);

  const filtered = users.filter((u) => (u.username || "").toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    if (a[sort.key] < b[sort.key]) return sort.direction === "asc" ? -1 : 1;
    if (a[sort.key] > b[sort.key]) return sort.direction === "asc" ? 1 : -1;
    return 0;
  });
  const slice = sorted.slice(page * rows, page * rows + rows);

  const cards = [
    { title: "Total Users", value: data?.total_users, icon: "👤" },
    { title: "Total Active Products", value: data?.active_products, icon: "📦" },
    { title: "Total Submissions Today", value: data?.total_submissions, icon: "🛒" },
    { title: "Total User Logins Today", value: data?.total_users_login_today?.count, icon: "🔑" },
  ];

  const userSeries = [{ name: "Users", data: Object.values(data?.user_registrations_per_month || {}) }];
  const subSeries = [{ name: "Submissions", data: Object.values(data?.total_submissions_per_month || {}) }];
  const chartOpts = {
    chart: { id: "users-chart-static" },
    colors: ["#1E3A8A"],
    xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
  };

  if (loading) return <LoadingBar />;
  if (error) return <FetchError retry={load} />;

  const cols = [
    { Header: "#", accessorKey: "id" },
    { Header: "Username", accessorKey: "username" },
    { Header: "Negative products submitted", accessorKey: "submitted" },
    { Header: "Balance", accessorKey: "balance" },
    { Header: "Today’s submission total", accessorKey: "submissionTotal" },
    { Header: "Today’s profit", accessorKey: "profit" },
    { Header: "Last Connection", accessorKey: "connection" },
    { Header: "On Hold", accessorKey: "onHold" },
  ];

  return (
    <div className="p-2 bg-gray-100 md:p-6">
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="flex items-center justify-between p-6 bg-white rounded-lg shadow-md">
            <div>
              <h3 className="font-semibold text-gray-600">{c.title}</h3>
              <h2 className="text-3xl font-bold text-blue-900">{c.value ?? 0}</h2>
            </div>
            <span className="text-4xl">{c.icon}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 font-semibold text-gray-600">Total Registered Users</h3>
          <Chart options={chartOpts} series={userSeries} type="radar" height={350} />
        </div>
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 font-semibold text-gray-600">Total Submissions</h3>
          <Chart options={{ ...chartOpts, chart: { id: "submission-chart-static" } }} series={subSeries} type="radar" height={350} />
        </div>
      </div>
      <div className="p-6 mt-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-600">Users logged in today</h3>
          <TextField size="small" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {cols.map((c) => (
                  <TableCell key={c.accessorKey}>
                    <TableSortLabel
                      active={sort.key === c.accessorKey}
                      direction={sort.key === c.accessorKey ? sort.direction : "asc"}
                      onClick={() =>
                        setSort((s) => ({
                          key: c.accessorKey,
                          direction: s.key === c.accessorKey && s.direction === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      {c.Header}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {slice.map((row) => (
                <TableRow key={row.id}>
                  {cols.map((c) => (
                    <TableCell key={c.accessorKey}>{row[c.accessorKey] ?? ""}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filtered.length}
            rowsPerPage={rows}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRows(+e.target.value);
              setPage(0);
            }}
          />
        </TableContainer>
      </div>
    </div>
  );
}
