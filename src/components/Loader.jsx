export default function Loader({ full = true }) {
  const inner = (
    <div id="container" className="flex space-x-2">
      <div id="ball-1" className="circle" />
      <div id="ball-2" className="circle" />
      <div id="ball-3" className="circle" />
    </div>
  );
  if (!full) return inner;
  return <div className="flex justify-center items-center h-screen bg-gray-50">{inner}</div>;
}

export function Spinner({ size = "md", color = "white" }) {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6", xl: "h-8 w-8" };
  const colors = {
    white: "border-white",
    gray: "border-gray-500",
    red: "border-red-500",
    blue: "border-blue-500",
  };
  return (
    <div className={`animate-spin rounded-full border-b-2 ${sizes[size]} ${colors[color]}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function OvalLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ width: 383, height: 383 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="100%" height="100%">
          <path
            style={{ transform: "scale(0.8)", transformOrigin: "50px 50px" }}
            strokeLinecap="round"
            d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z"
            strokeDasharray="207.83703186035157 48.75189636230468"
            strokeWidth="10"
            stroke="#ff0513"
            fill="none"
          >
            <animate values="0;256.58892822265625" keyTimes="0;1" dur="1s" repeatCount="indefinite" attributeName="stroke-dashoffset" />
          </path>
        </svg>
      </div>
    </div>
  );
}
