import { NavLink } from "react-router-dom";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex justify-around items-center py-2 md:hidden z-40">
      <NavLink
        to="/home"
        end
        className={({ isActive }) =>
          isActive ? "text-primary font-bold flex flex-col items-center" : "text-gray-400 flex flex-col items-center"
        }
      >
        <HomeIcon />
        <p className="text-xs">Home</p>
      </NavLink>
      <NavLink
        to="/home/starting"
        className={({ isActive }) =>
          isActive
            ? "text-primary font-bold flex flex-col items-center relative -top-5"
            : "text-gray-400 flex flex-col items-center relative -top-5"
        }
      >
        <div className="rounded-full w-12 h-12 overflow-hidden shadow-lg">
          <img src="/assets/icon_starting-BNU8a4iX.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <p className="text-xs mt-1">Starting</p>
      </NavLink>
      <NavLink
        to="/home/records"
        className={({ isActive }) =>
          isActive ? "text-primary font-bold flex flex-col items-center" : "text-gray-400 flex flex-col items-center"
        }
      >
        <RecordsIcon />
        <p className="text-xs">Records</p>
      </NavLink>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="text-2xl w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function RecordsIcon() {
  return (
    <svg className="text-2xl w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
      <path d="M2.5 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}
