import { useNavigate } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";

export default function BackButton({ label = "Back" }) {
  const navigate = useNavigate();
  return (
    <div className="w-fit bg-gray-200 p-2 rounded-lg shadow-sm mb-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-lg text-red-600">
        <IoChevronBack />
        <h2 className="text-xl font-bold text-gray-800 ml-4">{label}</h2>
      </button>
    </div>
  );
}
