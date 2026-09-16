export function PageHeader({ title }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-gray-700">{title}</h1>
      <nav className="text-sm text-gray-500">
        <span>Adsterra</span> / <span className="text-gray-700">{title}</span>
      </nav>
    </div>
  );
}

export function LoadingBar() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh]">
      <div className="flex items-center justify-center w-52 h-2.5 gap-2 overflow-hidden bg-gray-300 rounded-full">
        <span className="w-20 h-full bg-gray-400 rounded-full animate-pulse" />
      </div>
      <h3 className="mt-2 font-medium text-md">Loading please wait...</h3>
    </div>
  );
}

export function FetchError({ retry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center min-h-[40vh]">
      <div className="w-full max-w-md p-2 mx-auto">
        <h1 className="text-2xl font-semibold text-red-600">Oops! Something went wrong while fetching data.</h1>
        <button onClick={retry || (() => window.location.reload())} className="px-6 py-2 mt-3 bg-[#1976d2] text-white rounded-md">
          Retry
        </button>
      </div>
    </div>
  );
}
