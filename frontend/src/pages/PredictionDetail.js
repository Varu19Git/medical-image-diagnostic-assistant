import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { predictionService, imageService, reportService, feedbackService } from '../services/api';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const PredictionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [feedbackData, setFeedbackData] = useState({
    diagnosis_id: parseInt(id),
    feedback_text: '',
    override_diagnosis: '',
    rating: 0,
  });
  
  const [reportData, setReportData] = useState({
    diagnosis_id: parseInt(id),
    report_type: 'pdf',
    include_heatmaps: true,
    additional_notes: '',
  });
  
  const [activeTab, setActiveTab] = useState('predictions');

  // Fetch prediction data
  const { data: prediction, isLoading: isPredictionLoading, error: predictionError } = useQuery(
    ['prediction', id],
    () => predictionService.getPrediction(id).then(res => res.data),
    { enabled: !!id }
  );

  // Fetch image data if prediction is loaded
  const { data: image, isLoading: isImageLoading } = useQuery(
    ['image', prediction?.image_id],
    () => imageService.getImage(prediction.image_id).then(res => res.data),
    { enabled: !!prediction?.image_id }
  );

  // Fetch existing feedback if available
  const { data: feedback } = useQuery(
    ['feedback', id],
    () => feedbackService.getFeedback(id).then(res => res.data),
    { enabled: !!id }
  );

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation(
    (data) => feedbackService.createFeedback(data),
    {
      onSuccess: () => {
        toast.success('Feedback submitted successfully');
      },
      onError: (error) => {
        console.error('Feedback error:', error);
        toast.error('Failed to submit feedback');
      },
    }
  );

  // Generate report mutation
  const generateReportMutation = useMutation(
    (data) => reportService.createReport(data),
    {
      onSuccess: () => {
        toast.success('Report generation started. It will be available in the Reports section soon.');
      },
      onError: (error) => {
        console.error('Report generation error:', error);
        toast.error('Failed to generate report');
      },
    }
  );

  // Handle feedback form changes
  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  // Handle report form changes
  const handleReportChange = (e) => {
    const { name, value, type, checked } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit feedback
  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    submitFeedbackMutation.mutate(feedbackData);
  };

  // Generate report
  const handleGenerateReport = (e) => {
    e.preventDefault();
    generateReportMutation.mutate(reportData);
  };

  // Loading state
  if (isPredictionLoading || isImageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diagnosis data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (predictionError) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading diagnosis</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Unable to load the requested diagnosis. It may have been deleted or you may not have permission to view it.</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => navigate('/history')}
              >
                Back to History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare predictions data for display
  const sortedPredictions = prediction?.prediction_data
    ? Object.entries(prediction.prediction_data)
        .sort((a, b) => b[1] - a[1])
        .map(([label, confidence]) => ({ label, confidence }))
    : [];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Diagnosis #{id}
        </h1>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <button
            onClick={() => navigate('/history')}
            className="btn-secondary text-sm"
          >
            Back to History
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary text-sm"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          prediction?.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {prediction?.status === 'completed' ? (
            <>
              <CheckCircleIcon className="mr-1 h-3 w-3" />
              Completed
            </>
          ) : (
            <>
              <ClockIcon className="mr-1 h-3 w-3" />
              {prediction?.status || 'Pending'}
            </>
          )}
        </span>
        <span className="ml-2 text-sm text-gray-500">
          {new Date(prediction?.created_at).toLocaleString()}
        </span>
      </div>

      {/* Content */}
      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-3">
        {/* Image and details */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Image Details</h2>
            
            {image && (
              <>
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-4">
                  <img
                    src={`/api/images/file/${image.id}`} // This endpoint would need to be implemented in the backend
                    alt="Medical scan"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Original filename:</span>
                    <span className="text-gray-900 font-medium">{image.original_filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Image type:</span>
                    <span className="text-gray-900 font-medium">{image.image_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dimensions:</span>
                    <span className="text-gray-900 font-medium">{image.width} x {image.height} px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uploaded:</span>
                    <span className="text-gray-900 font-medium">{new Date(image.uploaded_at).toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Tabs for predictions, visualizations, and feedback */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('predictions')}
                  className={`${
                    activeTab === 'predictions'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <ChartBarIcon className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                  Predictions
                </button>
                <button
                  onClick={() => setActiveTab('visualizations')}
                  className={`${
                    activeTab === 'visualizations'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-2 -mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Visualization
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`${
                    activeTab === 'feedback'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline-block mr-2 -mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  Feedback
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={`${
                    activeTab === 'report'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <DocumentTextIcon className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                  Report
                </button>
              </nav>
            </div>
            
            {/* Tab content */}
            <div className="py-4">
              {/* Predictions tab */}
              {activeTab === 'predictions' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">AI Predictions</h3>
                  
                  {sortedPredictions.length > 0 ? (
                    <div className="space-y-4">
                      {sortedPredictions.map(({ label, confidence }) => (
                        <div key={label} className="bg-white border rounded-md p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-900">{label}</span>
                            <span className="text-sm font-bold text-primary-600">
                              {(confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${
                                confidence > 0.7
                                  ? 'bg-green-600'
                                  : confidence > 0.4
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                              }`}
                              style={{ width: `${confidence * 100}%` }}
                            ></div>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            {confidence > 0.7
                              ? 'High confidence prediction'
                              : confidence > 0.4
                              ? 'Medium confidence prediction'
                              : 'Low confidence prediction'}
                          </p>
                        </div>
                      ))}
                      
                      <div className="border-t border-gray-200 pt-4 mt-6">
                        <p className="text-sm text-gray-600">
                          <strong>Note:</strong> AI predictions are provided as a diagnostic aid and should be reviewed by a qualified healthcare professional.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No prediction data available
                    </div>
                  )}
                </div>
              )}
              
              {/* Visualizations tab */}
              {activeTab === 'visualizations' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Grad-CAM Visualizations</h3>
                  
                  {prediction?.heatmap_paths && Object.keys(prediction.heatmap_paths).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(prediction.heatmap_paths).map(([label, path]) => (
                        <div key={label} className="border rounded-md p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
                          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={`/api/heatmaps/file/${path}`} // This endpoint would need to be implemented
                              alt={`Grad-CAM for ${label}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            Heatmap highlighting regions that influenced the AI's prediction for {label}.
                          </p>
                        </div>
                      ))}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="font-medium text-blue-800 mb-1">Understanding Grad-CAM Visualizations</h4>
                        <p className="text-sm text-blue-700">
                          The colored regions indicate areas that the AI focused on to make its prediction. Red and yellow areas had the strongest influence on the model's decision.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No visualization data available yet. Visualizations are typically generated within a minute after the prediction.
                    </div>
                  )}
                </div>
              )}
              
              {/* Feedback tab */}
              {activeTab === 'feedback' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Doctor's Feedback</h3>
                  
                  {feedback ? (
                    <div className="border rounded-md p-4">
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Feedback by:</span>
                          <span className="ml-2 font-medium">{feedback.user_name || 'Doctor'}</span>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-500">Rating:</span>
                          <span className="ml-2">
                            {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                            <span className="ml-1 text-sm text-gray-500">({feedback.rating}/5)</span>
                          </span>
                        </div>
                        
                        {feedback.override_diagnosis && (
                          <div>
                            <span className="text-sm text-gray-500">Override diagnosis:</span>
                            <p className="mt-1 text-gray-900 font-medium">{feedback.override_diagnosis}</p>
                          </div>
                        )}
                        
                        {feedback.feedback_text && (
                          <div>
                            <span className="text-sm text-gray-500">Comments:</span>
                            <p className="mt-1 text-gray-900">{feedback.feedback_text}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Submitted on {new Date(feedback.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitFeedback}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="rating" className="form-label">
                            AI Accuracy Rating (1-5)
                          </label>
                          <select
                            id="rating"
                            name="rating"
                            className="form-input"
                            value={feedbackData.rating}
                            onChange={handleFeedbackChange}
                            required
                          >
                            <option value="0">Select a rating</option>
                            <option value="1">★ (Poor)</option>
                            <option value="2">★★ (Fair)</option>
                            <option value="3">★★★ (Good)</option>
                            <option value="4">★★★★ (Very Good)</option>
                            <option value="5">★★★★★ (Excellent)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="override_diagnosis" className="form-label">
                            Override Diagnosis (if needed)
                          </label>
                          <input
                            type="text"
                            id="override_diagnosis"
                            name="override_diagnosis"
                            className="form-input"
                            value={feedbackData.override_diagnosis}
                            onChange={handleFeedbackChange}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="feedback_text" className="form-label">
                            Additional Comments
                          </label>
                          <textarea
                            id="feedback_text"
                            name="feedback_text"
                            rows={4}
                            className="form-input"
                            value={feedbackData.feedback_text}
                            onChange={handleFeedbackChange}
                          />
                        </div>
                        
                        <div>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitFeedbackMutation.isLoading || feedbackData.rating === 0}
                          >
                            {submitFeedbackMutation.isLoading ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
              
              {/* Report tab */}
              {activeTab === 'report' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Report</h3>
                  
                  <form onSubmit={handleGenerateReport}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="report_type" className="form-label">
                          Report Format
                        </label>
                        <select
                          id="report_type"
                          name="report_type"
                          className="form-input"
                          value={reportData.report_type}
                          onChange={handleReportChange}
                        >
                          <option value="pdf">PDF Report</option>
                          <option value="txt">Plain Text Report</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="include_heatmaps"
                          name="include_heatmaps"
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={reportData.include_heatmaps}
                          onChange={handleReportChange}
                          disabled={reportData.report_type === 'txt'}
                        />
                        <label htmlFor="include_heatmaps" className="ml-2 text-sm text-gray-700">
                          Include heatmap visualizations (PDF only)
                        </label>
                      </div>
                      
                      <div>
                        <label htmlFor="additional_notes" className="form-label">
                          Additional Notes for Report
                        </label>
                        <textarea
                          id="additional_notes"
                          name="additional_notes"
                          rows={4}
                          className="form-input"
                          value={reportData.additional_notes}
                          onChange={handleReportChange}
                        />
                      </div>
                      
                      <div>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={generateReportMutation.isLoading}
                        >
                          {generateReportMutation.isLoading ? 'Generating...' : 'Generate Report'}
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        <p>Generated reports will be available in the Reports section.</p>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionDetail;
