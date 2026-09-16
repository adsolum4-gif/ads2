import { useEffect, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { toast } from "sonner";
import { api, unwrap, showError } from "../api/client";
import { endpoints } from "../api/endpoints";
import { PageHeader, LoadingBar } from "../components/PageHeader";

export default function Video() {
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(endpoints.SETTINGS);
        const data = unwrap(res);
        setSrc(data?.video || "");
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!file) return toast.error("Choose File");
    setSaving(true);
    try {
      const body = new FormData();
      body.append("video", file);
      await api.post(endpoints.POST_VIDEO, body);
      toast.success("Video updated successfully");
      setSrc(URL.createObjectURL(file));
    } catch (e) { showError(e); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingBar />;

  return (
    <div className="p-2 md:p-6">
      <PageHeader title="Update video" />
      <div className="p-6 bg-white rounded-lg shadow">
        {src && (
          <video className="w-full max-h-[420px] mb-4" controls>
            <source src={file ? URL.createObjectURL(file) : src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        <Button variant="outlined" component="label">
          Choose File
          <input hidden type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
        </Button>
        <span className="ml-3 text-sm">{file?.name || "No file chosen"}</span>
        <div className="mt-4">
          <Button variant="contained" color="error" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
