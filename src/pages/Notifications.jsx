import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import BackButton from "../components/BackButton";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../store/slices/notificationsSlice";

export default function Notifications() {
  const dispatch = useDispatch();
  const { notifications, isLoading } = useSelector((s) => s.notifications);
  const [page, setPage] = useState(1);
  const per = 20;
  const slice = notifications.slice((page - 1) * per, page * per);
  const pages = Math.max(1, Math.ceil(notifications.length / per));

  useEffect(() => {
    dispatch(fetchNotifications());
    const id = setInterval(() => dispatch(fetchNotifications(true)), 120000);
    return () => clearInterval(id);
  }, [dispatch]);

  return (
    <div className="p-2 md:mb-24 mb-52">
      {!isLoading && (
        <>
          <BackButton label="Notifications" />
          <div className="flex justify-between items-center md:mb-0 mb-8">
            <p className="text-gray-700 mb-4">
              {notifications.length} Notification{notifications.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => dispatch(markAllNotificationsRead())}
              disabled={isLoading || notifications.every((n) => n.is_read)}
              className="text-white bg-red-600 px-4 py-1 rounded-full font-semibold text-sm mt-3 md:mt-0 disabled:bg-gray-400"
            >
              Mark all read
            </button>
          </div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {slice.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-4 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center ${item.is_read ? "" : "border-l-4 border-red-600"}`}
              >
                <div className="flex-1">
                  {item.title && <p className="text-gray-900 font-semibold mb-1">{item.title}</p>}
                  <p className="text-gray-800 text-justify whitespace-pre-line">{item.message}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ""}
                  </p>
                </div>
                {!item.is_read && (
                  <button
                    onClick={() => dispatch(markNotificationRead(item.id))}
                    className="text-white bg-red-600 px-4 py-1 rounded-full font-semibold text-sm mt-3 md:mt-0 md:ml-4"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </motion.div>
          <div className="absolute bottom-0 md:left-[310px] right-1 md:max-w-6xl mx-auto w-full bg-white p-4 border-t flex justify-between items-center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-90">
              Previous
            </button>
            <p className="text-gray-700">
              Page {page} of {pages}
            </p>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-50">
              Next
            </button>
          </div>
          {notifications.length === 0 && <p className="text-gray-500 text-center">No notifications available</p>}
        </>
      )}
    </div>
  );
}
