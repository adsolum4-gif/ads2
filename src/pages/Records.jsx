import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FaStar } from "react-icons/fa";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import ProductImage from "../components/ProductImage";
import { fetchGameRecords, playGame } from "../store/slices/productsSlice";
import { showApiError } from "../api/client";
import { fadeIn } from "../utils/motion";

const STATUS = {
  Completed: "bg-green-100 text-green-600",
  Pending: "bg-yellow-100 text-yellow-600",
  Freeze: "bg-blue-100 text-blue-600",
};

const statusOf = (item) => (item.pending ? "Pending" : !item.pending && item.rating_score === 0 ? "Freeze" : "Completed");

export default function Records() {
  const dispatch = useDispatch();
  const records = useSelector((s) => s.products.gameRecords) || [];
  const loading = useSelector((s) => s.products.isLoading);
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const per = 20;
  const filtered = tab === "All" ? records : records.filter((r) => statusOf(r) === tab);
  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);

  useEffect(() => {
    dispatch(fetchGameRecords());
  }, [dispatch]);

  const submitPending = async () => {
    try {
      const result = await dispatch(playGame(4, ""));
      if (result.success) {
        toast.success("Submission successful!");
        dispatch(fetchGameRecords());
      } else showApiError(result.message);
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <div className="md:p-4 p-2 md:max-w-7xl mx-auto md:mb-2 mb-24">
      <BackButton />
      <motion.div initial={fadeIn("right").initial} animate={fadeIn("right", 2).animate} className="flex justify-center space-x-4 md:space-x-8 mb-4 md:mb-6">
        {["All", "Completed", "Pending", "Freeze"].map((name) => (
          <button
            key={name}
            onClick={() => {
              setTab(name);
              setPage(1);
            }}
            className={`px-3 pb-1 text-sm md:text-base ${tab === name ? "text-red-600 font-semibold border-b-2 border-red-600" : "text-gray-600"}`}
          >
            {name}
          </button>
        ))}
      </motion.div>
      {loading ? (
        <Loader />
      ) : slice.length > 0 ? (
        <div className="space-y-4 md:space-y-6 md:mb-24 mb-52">
          {slice.map((item) => {
            const status = statusOf(item);
            return (
              <div key={item.id} className="bg-white rounded-lg shadow-lg p-4 md:p-5 flex items-start space-x-4 md:space-x-6 relative">
                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS[status]}`}>{status}</div>
                  {status === "Pending" && (
                    <button onClick={submitPending} className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-600 rounded-full">
                      Submit
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 w-24 pb-4">
                  {item.products?.map((p) => (
                    <div key={p.id} className="w-20 h-24 flex-shrink-0 flex flex-col items-center">
                      <ProductImage src={p.image} name={p.name} alt={p.name} className="w-20 h-20 object-cover rounded-md" />
                      <p className="text-center text-sm mt-2">{p.name}</p>
                    </div>
                  ))}
                </div>
                <div className="flex-grow">
                  <p className="text-gray-500 text-xs md:text-sm mb-1">{item.updated_at ? new Date(item.updated_at).toLocaleString() : ""}</p>
                  <p className="text-md md:text-lg font-bold text-gray-800">{item.products?.[0]?.name}</p>
                  <div className="flex items-center text-yellow-500 my-1">
                    <span className="text-xs md:text-sm mr-1">Score Ranking</span>
                    {Array(item.rating_score || 0)
                      .fill(0)
                      .map((_, i) => (
                        <FaStar key={i} className="text-xs md:text-sm" />
                      ))}
                  </div>
                  <div className="flex justify-between mt-2 md:mt-4">
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Total Amount</p>
                      <p className="text-sm md:text-lg font-bold text-gray-800">USD {item.amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs md:text-sm">Commission</p>
                      <p className="text-sm md:text-lg font-bold text-red-600">USD {item.commission}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500">No {tab} Records</p>
      )}
      {filtered.length > per && (
        <div className="absolute bottom-0 md:left-[310px] right-1 md:max-w-6xl mx-auto w-full bg-white p-4 border-t flex justify-between items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">
            Previous
          </button>
          <p className="text-gray-600">
            Page {page} of {pages}
          </p>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
