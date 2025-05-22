import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation } from 'react-query';
import { userService } from '../services/api';
import { toast } from 'react-hot-toast';

const UserProfile = () => {
  const { user } = useAuth();
  
  // Fetch user details
  const { data: userData, isLoading } = useQuery(
    ['user', user?.id],
    () => userService.getUser(user.id).then(res => res.data),
    { enabled: !!user?.id }
  );
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  // Update user details once data is loaded
  React.useEffect(() => {
    if (userData) {
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
      });
    }
  }, [userData]);
  
  // Handle form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Update profile mutation
  const updateProfileMutation = useMutation(
    (data) => userService.updateUser(user.id, data),
    {
      onSuccess: () => {
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        console.error('Update profile error:', error);
        toast.error('Failed to update profile');
      },
    }
  );
  
  // Change password mutation (this would be a separate endpoint in a real application)
  const changePasswordMutation = useMutation(
    (data) => userService.updateUser(user.id, { password: data.new_password }),
    {
      onSuccess: () => {
        toast.success('Password changed successfully');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      },
      onError: (error) => {
        console.error('Change password error:', error);
        toast.error('Failed to change password');
      },
    }
  );
  
  // Handle profile update
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };
  
  // Handle password change
  const handleChangePassword = (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    // In a real application, we would verify the current password on the server
    changePasswordMutation.mutate(passwordData);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">User Profile</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* User information card */}
        <div className="sm:col-span-6 lg:col-span-2">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-lg font-semibold">
                {userData?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">{userData?.username}</h2>
                <p className="text-sm text-gray-500">
                  <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-800">
                    {userData?.role}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <dl className="divide-y divide-gray-200">
                <div className="py-2 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Full name</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{userData?.full_name || 'Not set'}</dd>
                </div>
                <div className="py-2 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{userData?.email}</dd>
                </div>
                <div className="py-2 grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-500">Member since</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        {/* Edit profile form */}
        <div className="sm:col-span-6 lg:col-span-4">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Profile</h2>
            
            <form onSubmit={handleUpdateProfile}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="full_name" className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    className="form-input"
                    value={formData.full_name}
                    onChange={handleProfileChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleProfileChange}
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={updateProfileMutation.isLoading}
                  >
                    {updateProfileMutation.isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Change Password</h3>
              
              <form onSubmit={handleChangePassword}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="current_password" className="form-label">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="current_password"
                      name="current_password"
                      className="form-input"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="new_password" className="form-label">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      className="form-input"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirm_password" className="form-label">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      className="form-input"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={changePasswordMutation.isLoading}
                    >
                      {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
