import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">404</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Page not found
          </p>
        </div>
        <div className="mt-8 text-gray-600">
          <p>The page you are looking for doesn't exist or has been moved.</p>
        </div>
        <div className="mt-6">
          <Link to="/" className="btn-primary inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
