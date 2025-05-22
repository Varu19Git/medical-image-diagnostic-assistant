import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { imageService, predictionService } from '../services/api';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageType, setImageType] = useState('x-ray');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  // Handle file drop
  const onDrop = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    
    // Check file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    
    // Check file size (16MB max)
    if (selectedFile.size > 16 * 1024 * 1024) {
      toast.error('File size exceeds 16MB limit');
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview URL for the image
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
  };
  
  // Initialize dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.dicom']
    },
    maxFiles: 1
  });
  
  // Clear the selected file
  const clearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
  };
  
  // Handle file upload and prediction
  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload image
      toast.loading('Uploading image...');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Upload the image
      const imageResponse = await imageService.uploadImage(file, imageType);
      const imageId = imageResponse.data.id;
      
      // Clear progress interval
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.dismiss();
      toast.success('Image uploaded successfully');
      
      // Perform AI prediction
      toast.loading('Analyzing image with AI...');
      const predictionResponse = await predictionService.createPrediction({
        image_id: imageId,
        model_name: getModelNameForImageType(imageType)
      });
      
      toast.dismiss();
      toast.success('Analysis complete');
      
      // Navigate to prediction detail page
      navigate(`/predictions/${predictionResponse.data.id}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.dismiss();
      
      if (error.response && error.response.data && error.response.data.detail) {
        toast.error(`Upload failed: ${error.response.data.detail}`);
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Get model name based on image type
  const getModelNameForImageType = (type) => {
    switch (type) {
      case 'x-ray':
        return 'chest-xray';
      case 'brain-mri':
        return 'brain-mri';
      default:
        return 'chest-xray';
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Upload Medical Image</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2">
        {/* Image upload section */}
        <div>
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Image Upload</h2>
            
            {!file ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50 ${
                  isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                }`}
              >
                <input {...getInputProps()} />
                <div className="mx-auto w-12 h-12 text-gray-400">
                  <ArrowUpTrayIcon className="w-12 h-12" />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop an image here, or click to select a file
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports PNG, JPG, JPEG, GIF, BMP, TIFF, and DICOM (up to 16MB)
                </p>
              </div>
            ) : (
              <div className="relative border rounded-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="p-1 rounded-full hover:bg-gray-100"
                    disabled={isUploading}
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="mt-2 relative rounded-md overflow-hidden aspect-video bg-gray-100">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 text-right">
                      {uploadProgress}% complete
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4">
              <label htmlFor="imageType" className="form-label">
                Image Type
              </label>
              <select
                id="imageType"
                name="imageType"
                className="form-input"
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                disabled={isUploading}
              >
                <option value="x-ray">X-Ray</option>
                <option value="ct-scan">CT Scan</option>
                <option value="mri">MRI</option>
                <option value="brain-mri">Brain MRI</option>
                <option value="ultrasound">Ultrasound</option>
              </select>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleUpload}
                className="w-full btn-primary py-2"
                disabled={!file || isUploading}
              >
                {isUploading ? 'Processing...' : 'Upload and Analyze'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Instructions and information */}
        <div>
          <div className="card bg-blue-50 border border-blue-100">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Upload Guidelines</h2>
            
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-blue-600">•</span>
                <span className="ml-2">
                  <strong>Image Quality:</strong> Upload high-resolution images for better AI accuracy.
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-blue-600">•</span>
                <span className="ml-2">
                  <strong>Image Type:</strong> Select the correct image type from the dropdown for appropriate model selection.
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-blue-600">•</span>
                <span className="ml-2">
                  <strong>Processing Time:</strong> Analysis typically takes 10-30 seconds depending on the image size.
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-blue-600">•</span>
                <span className="ml-2">
                  <strong>Supported Models:</strong> The system currently supports chest X-ray analysis (pneumonia, tuberculosis, COVID-19) and brain MRI analysis (tumor detection).
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-blue-600">•</span>
                <span className="ml-2">
                  <strong>Privacy:</strong> All uploaded images are stored securely and only accessible to authorized personnel.
                </span>
              </li>
            </ul>
            
            <div className="mt-6 p-4 border border-yellow-300 rounded-md bg-yellow-50">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> This system is designed to assist medical professionals. AI predictions should always be reviewed by a qualified healthcare provider before making clinical decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
