import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { predictionService, imageService } from '../services/api';
import { ChartBarIcon, DocumentTextIcon, PhotoIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const DashboardCard = ({ title, value, icon, color, description }) => {
  const IconComponent = icon;
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${color}`}>
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {description && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      )}
    </div>
  );
};

const RecentActivity = ({ title, items, type }) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {items.length > 0 ? (
            items.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <Link to={type === 'prediction' ? `/predictions/${item.id}` : `/reports/${item.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {type === 'prediction' ? (
                        <PhotoIcon className="h-5 w-5 text-gray-400 mr-3" />
                      ) : (
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <p className="text-sm font-medium text-primary-600 truncate">
                        {type === 'prediction' 
                          ? `Diagnosis #${item.id} - ${new Date(item.created_at).toLocaleString()}`
                          : `Report #${item.id} - ${new Date(item.generated_at).toLocaleString()}`
                        }
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {type === 'prediction' ? item.status : item.report_type}
                      </p>
                    </div>
                  </div>
                  {type === 'prediction' && (
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Confidence: {Math.round(item.confidence_score * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            ))
          ) : (
            <li className="px-4 py-5 sm:px-6 text-center text-gray-500">
              No recent {type === 'prediction' ? 'diagnoses' : 'reports'} found
            </li>
          )}
        </ul>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <Link
          to={type === 'prediction' ? '/history' : '/reports'}
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          View all
          <span aria-hidden="true"> &rarr;</span>
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalImages: 0,
    totalDiagnoses: 0,
    totalReports: 0,
    pendingDiagnoses: 0,
  });

  // Fetch recent diagnoses
  const { data: recentDiagnoses = [] } = useQuery('recentDiagnoses', () =>
    predictionService.getPredictions({ limit: 5 }).then((res) => res.data)
  );

  // Fetch total counts for dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In a real app, we would have dedicated endpoints for these stats
        // For now, we'll just get the counts from the list endpoints
        const [imagesRes, diagnosesRes] = await Promise.all([
          imageService.getImages({ limit: 1 }),
          predictionService.getPredictions({ limit: 1 }),
        ]);

        // Extract total counts from headers or response data
        // This is a placeholder - in a real app you'd have proper pagination with counts
        setStats({
          totalImages: imagesRes.headers['x-total-count'] || 0,
          totalDiagnoses: diagnosesRes.headers['x-total-count'] || 0,
          totalReports: 0, // Would come from a reports endpoint
          pendingDiagnoses: 0, // Would filter diagnoses by status
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Images"
            value={stats.totalImages}
            icon={PhotoIcon}
            color="bg-blue-500"
            description="Total medical images uploaded"
          />
          <DashboardCard
            title="Total Diagnoses"
            value={stats.totalDiagnoses}
            icon={ChartBarIcon}
            color="bg-green-500"
            description="AI diagnoses performed"
          />
          <DashboardCard
            title="Total Reports"
            value={stats.totalReports}
            icon={DocumentTextIcon}
            color="bg-purple-500"
            description="Generated diagnostic reports"
          />
          <DashboardCard
            title="Pending Reviews"
            value={stats.pendingDiagnoses}
            icon={ArrowUpTrayIcon}
            color="bg-yellow-500"
            description="Diagnoses waiting for review"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity
          title="Recent Diagnoses"
          items={recentDiagnoses}
          type="prediction"
        />
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/upload"
                className="btn-primary text-center py-3 px-4 rounded-md"
              >
                Upload New Image
              </Link>
              <Link
                to="/history"
                className="btn-secondary text-center py-3 px-4 rounded-md"
              >
                View History
              </Link>
              <Link
                to="/reports"
                className="btn-secondary text-center py-3 px-4 rounded-md"
              >
                Manage Reports
              </Link>
              <Link
                to="/profile"
                className="btn-secondary text-center py-3 px-4 rounded-md"
              >
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
