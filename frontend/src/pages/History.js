import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { predictionService } from '../services/api';
import { ChartBarIcon, EyeIcon, CalendarIcon } from '@heroicons/react/24/outline';

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Fetch diagnoses with pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { data, isLoading, error } = useQuery(
    ['diagnoses', page, limit],
    () => predictionService.getPredictions({ skip: (page - 1) * limit, limit }).then(res => res.data),
    { keepPreviousData: true }
  );
  
  // Filter and search diagnoses
  const filteredDiagnoses = data
    ? data.filter(diagnosis => {
        // Filter by status
        if (filter !== 'all' && diagnosis.status !== filter) {
          return false;
        }
        
        // Search by ID or date
        if (searchTerm && !diagnosis.id.toString().includes(searchTerm) && 
            !new Date(diagnosis.created_at).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        return true;
      })
    : [];
  
  // Handle pagination
  const handlePreviousPage = () => {
    setPage(old => Math.max(old - 1, 1));
  };
  
  const handleNextPage = () => {
    if (data && data.length === limit) {
      setPage(old => old + 1);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Diagnosis History</h1>
      
      {/* Filters and search */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex space-x-2">
          <select
            className="form-input max-w-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search by ID or date..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading diagnoses...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading diagnoses</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Unable to load your diagnosis history. Please try again later.</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredDiagnoses.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No diagnoses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Upload an image to get started with your first diagnosis'}
            </p>
            <div className="mt-6">
              <Link to="/upload" className="btn-primary">
                Upload New Image
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-white shadow rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image Type
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDiagnoses.map((diagnosis) => (
                    <tr key={diagnosis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        #{diagnosis.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {new Date(diagnosis.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {diagnosis.image_type || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          diagnosis.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : diagnosis.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {diagnosis.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {diagnosis.confidence_score
                          ? `${Math.round(diagnosis.confidence_score * 100)}%`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/predictions/${diagnosis.id}`}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          <EyeIcon className="h-5 w-5 inline-block mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    page === 1
                      ? 'text-gray-300 bg-gray-50'
                      : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!data || data.length < limit}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    !data || data.length < limit
                      ? 'text-gray-300 bg-gray-50'
                      : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{page}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        page === 1
                          ? 'text-gray-300 bg-gray-50'
                          : 'text-gray-500 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!data || data.length < limit}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        !data || data.length < limit
                          ? 'text-gray-300 bg-gray-50'
                          : 'text-gray-500 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default History;
