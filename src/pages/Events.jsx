import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { fetchEvents } from "../store/slices/eventsSlice";

export default function Events() {
  const dispatch = useDispatch();
  const [index, setIndex] = useState(0);
  const { events, isLoading } = useSelector((s) => s.event);

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const next = () => setIndex((i) => (i + 1) % Math.max(events.length, 1));
  const prev = () => setIndex((i) => (i - 1 + events.length) % Math.max(events.length, 1));

  if (isLoading) return <Loader />;

  return (
    <div className="relative w-full md:max-w-7xl p-2 md:p-0 mx-auto my-8 overflow-hidden">
      <BackButton />
      {events.length > 0 ? (
        <>
          <div className="flex justify-between absolute top-1/2 transform -translate-y-1/2 -translate-x-3 w-full px-4 z-10">
            <button onClick={prev} className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
              <IoChevronBack />
            </button>
            <button onClick={next} className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
              <IoChevronForward />
            </button>
          </div>
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center items-center w-full h-[700px] md:h-[500px]"
          >
            <img src={events[index]?.image} alt={`Event ${index + 1}`} className="object-contain rounded-lg w-full h-full" />
          </motion.div>
          <div className="flex justify-center mt-4 space-x-2">
            {events.map((_, i) => (
              <span key={i} onClick={() => setIndex(i)} className={`cursor-pointer w-3 h-3 rounded-full ${i === index ? "bg-red-600" : "bg-gray-400"}`} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-16 text-center text-gray-500">No events available.</p>
      )}
    </div>
  );
}
