import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { reportService } from '../services/api';
import { DocumentTextIcon, DocumentArrowDownIcon, DocumentMagnifyingGlassIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const Reports = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Fetch reports with pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { data, isLoading, error } = useQuery(
    ['reports', page, limit],
    () => reportService.getReports({ skip: (page - 1) * limit, limit }).then(res => res.data),
    { keepPreviousData: true }
  );
  
  // Filter and search reports
  const filteredReports = data
    ? data.filter(report => {
        // Filter by type
        if (filter !== 'all' && report.report_type !== filter) {
          return false;
        }
        
        // Search by ID or date
        if (searchTerm && !report.diagnosis_id.toString().includes(searchTerm) && 
            !new Date(report.generated_at).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase())) {
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
  
  // Handle report download
  const handleDownload = (reportPath, reportType) => {
    // In a real application, this would initiate a download of the report file
    // For now, we'll just simulate this with an alert
    alert(`Downloading report: ${reportPath}`);
    
    // The actual download would look something like this:
    // window.open(`/api/reports/download/${reportId}`, '_blank');
  };
  
  // Format report type for display
  const formatReportType = (type) => {
    return type === 'pdf' ? 'PDF' : 'Text';
  };
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Diagnostic Reports</h1>
      
      {/* Filters and search */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex space-x-2">
          <select
            className="form-input max-w-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="pdf">PDF reports</option>
            <option value="txt">Text reports</option>
          </select>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search by diagnosis ID or date..."
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
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading reports</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Unable to load your reports. Please try again later.</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Generate a report from a diagnosis to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <li key={report.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {report.report_type === 'pdf' ? (
                        <DocumentDuplicateIcon className="h-6 w-6 text-red-500" />
                      ) : (
                        <DocumentTextIcon className="h-6 w-6 text-blue-500" />
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          Report #{report.id} for Diagnosis #{report.diagnosis_id}
                        </p>
                        <p className="text-sm text-gray-500">
                          Generated: {new Date(report.generated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.report_type === 'pdf' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {formatReportType(report.report_type)}
                      </span>
                      <button
                        onClick={() => handleDownload(report.report_path, report.report_type)}
                        className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        title="Download report"
                      >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => window.open(`/preview/${report.id}`, '_blank')}
                        className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                        title="Preview report"
                      >
                        <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
