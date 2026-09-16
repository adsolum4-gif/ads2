import { useEffect, useState } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar } from "../components/PageHeader";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [pass, setPass] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(endpoints.GET_ADMIN);
        setForm(unwrap(res) || {});
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body = new FormData();
      ["username", "first_name", "last_name", "phone_number", "email"].forEach((k) => form[k] != null && body.append(k, form[k]));
      if (form.profile_picture instanceof File) body.append("profile_picture", form.profile_picture);
      await api.patch(endpoints.PATCH_PROFILE, body);
      toast.success("Profile updated successfully");
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  const changePass = async () => {
    if (pass.new_password !== pass.confirm) return toast.error("Passwords do not match");
    try {
      await api.post(endpoints.CHANGE_PASSWORD, {
        current_password: pass.current_password,
        new_password: pass.new_password,
      });
      toast.success("Password updated successfully");
      setPass({});
    } catch (e) { showError(e); }
  };

  if (loading) return <LoadingBar />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Admin Profile" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 space-y-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold">Update profile</h3>
          <div className="flex items-center gap-4">
            <img src={form.profile_picture instanceof File ? URL.createObjectURL(form.profile_picture) : form.profile_picture || "/assets/profile-pic-Cd7mtiQf.jpg"} alt="Profile picture" className="object-cover w-16 h-16 rounded-full" />
            <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, profile_picture: e.target.files[0] })} />
          </div>
          <TextField fullWidth label="User Name" value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <TextField fullWidth label="First Name" value={form.first_name || ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <TextField fullWidth label="Last Name" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <TextField fullWidth label="Phone Number" value={form.phone_number || ""} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <TextField fullWidth label="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Button variant="contained" color="error" onClick={save} disabled={saving}>{saving ? <CircularProgress size={16} /> : "Save"}</Button>
        </div>
        <div className="p-6 space-y-4 bg-white rounded-lg shadow">
          <h3 className="font-semibold">Update Account Password</h3>
          <TextField fullWidth type="password" label="Current Password" value={pass.current_password || ""} onChange={(e) => setPass({ ...pass, current_password: e.target.value })} />
          <TextField fullWidth type="password" label="New Password" value={pass.new_password || ""} onChange={(e) => setPass({ ...pass, new_password: e.target.value })} />
          <TextField fullWidth type="password" label="Confirm Password" value={pass.confirm || ""} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} />
          <Button variant="contained" onClick={changePass}>Save</Button>
        </div>
      </div>
    </div>
  );
}
