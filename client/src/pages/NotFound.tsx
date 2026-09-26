import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-gradient-to-b from-orange-50/60 to-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-orange-500">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mt-2 mb-8 text-gray-500">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Go Home
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
