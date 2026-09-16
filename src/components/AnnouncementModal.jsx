import { motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FaBullhorn, FaCheckCircle } from "react-icons/fa";

export default function AnnouncementModal({ announcement, onClose }) {
  if (!announcement) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 100 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, duration: 0.5 }}
        className="bg-gradient-to-br from-white via-white to-gray-50 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-100 to-red-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-3xl opacity-20 -ml-24 -mb-24" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
          aria-label="Close"
        >
          <IoClose className="text-xl" />
        </button>
        <div className="p-8 relative">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="relative bg-gradient-to-br from-red-500 to-red-700 rounded-full p-6 shadow-lg">
                <FaBullhorn className="text-white text-5xl" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg">
                <FaCheckCircle className="text-white text-xl" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 bg-clip-text text-transparent mb-4">
            {announcement.title}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-6" />
          <div
            className="text-gray-700 text-left mb-8 leading-relaxed text-sm md:text-base whitespace-pre-line px-2 max-h-[40vh] overflow-y-auto pr-2 announcement-message-scroll"
          >
            {announcement.message}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaCheckCircle className="text-xl" />
              <span className="text-lg">Got it, Thanks!</span>
            </span>
          </button>
          <div className="text-center mt-4 text-sm text-gray-400">Click anywhere outside to close</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
