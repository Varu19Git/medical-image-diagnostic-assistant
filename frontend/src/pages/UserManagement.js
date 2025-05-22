import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const UserManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'doctor',
  });
  
  const [editUserData, setEditUserData] = useState({
    full_name: '',
    email: '',
    role: '',
    is_active: true,
  });
  
  // Fetch users
  const { data: users, isLoading, error } = useQuery(
    'users',
    () => userService.getUsers().then(res => res.data),
    { 
      enabled: !!user && user.role === 'admin',
      refetchOnWindowFocus: false,
    }
  );
  
  // Filter users based on search and role filter
  const filteredUsers = users
    ? users.filter(user => {
        // Filter by role
        if (roleFilter !== 'all' && user.role !== roleFilter) {
          return false;
        }
        
        // Search by username, email, or full name
        if (searchTerm && 
            !user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !user.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !(user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))) {
          return false;
        }
        
        return true;
      })
    : [];
  
  // Add user mutation
  const addUserMutation = useMutation(
    (userData) => userService.createUser(userData),
    {
      onSuccess: () => {
        toast.success('User created successfully');
        setIsAddUserModalOpen(false);
        setNewUserData({
          username: '',
          email: '',
          password: '',
          full_name: '',
          role: 'doctor',
        });
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        console.error('Create user error:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to create user';
        toast.error(errorMessage);
      },
    }
  );
  
  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, data }) => userService.updateUser(id, data),
    {
      onSuccess: () => {
        toast.success('User updated successfully');
        setIsEditUserModalOpen(false);
        setSelectedUser(null);
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        console.error('Update user error:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to update user';
        toast.error(errorMessage);
      },
    }
  );
  
  // Delete user mutation
  const deleteUserMutation = useMutation(
    (id) => userService.deleteUser(id),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries('users');
      },
      onError: (error) => {
        console.error('Delete user error:', error);
        const errorMessage = error.response?.data?.detail || 'Failed to delete user';
        toast.error(errorMessage);
      },
    }
  );
  
  // Handle form changes
  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleEditUserChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditUserData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submissions
  const handleAddUser = (e) => {
    e.preventDefault();
    addUserMutation.mutate(newUserData);
  };
  
  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: editUserData,
    });
  };
  
  // Open edit modal with user data
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditUserData({
      full_name: user.full_name || '',
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setIsEditUserModalOpen(true);
  };
  
  // Handle delete user
  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  // If not an admin, show access denied
  if (user && user.role !== 'admin') {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>You do not have permission to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <button 
          className="btn-primary flex items-center"
          onClick={() => setIsAddUserModalOpen(true)}
        >
          <UserPlusIcon className="h-5 w-5 mr-1" />
          Add User
        </button>
      </div>
      
      {/* Filters and search */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="flex space-x-2">
          <select
            className="form-input max-w-xs"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="doctor">Doctors</option>
            <option value="reviewer">Reviewers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
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
      
      {/* User list */}
      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Unable to load the user list. Please try again later.</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding a new user'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-semibold">
                            {userData.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userData.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userData.full_name || 'No name provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userData.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userData.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : userData.role === 'doctor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userData.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(userData)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        disabled={userData.id === user.id}
                      >
                        <PencilIcon className="h-5 w-5 inline-block" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userData.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={userData.id === user.id}
                      >
                        <TrashIcon className="h-5 w-5 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setIsAddUserModalOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Add New User</h3>
                  
                  <form onSubmit={handleAddUser} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="username" className="form-label">Username</label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        className="form-input"
                        value={newUserData.username}
                        onChange={handleNewUserChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-input"
                        value={newUserData.email}
                        onChange={handleNewUserChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="form-label">Password</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        className="form-input"
                        value={newUserData.password}
                        onChange={handleNewUserChange}
                        required
                        minLength={8}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="full_name" className="form-label">Full Name</label>
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        className="form-input"
                        value={newUserData.full_name}
                        onChange={handleNewUserChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="form-label">Role</label>
                      <select
                        id="role"
                        name="role"
                        className="form-input"
                        value={newUserData.role}
                        onChange={handleNewUserChange}
                        required
                      >
                        <option value="doctor">Doctor</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                        disabled={addUserMutation.isLoading}
                      >
                        {addUserMutation.isLoading ? 'Creating...' : 'Create User'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={() => setIsAddUserModalOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {isEditUserModalOpen && selectedUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => {
                    setIsEditUserModalOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Edit User: {selectedUser.username}</h3>
                  
                  <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="full_name" className="form-label">Full Name</label>
                      <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        className="form-input"
                        value={editUserData.full_name}
                        onChange={handleEditUserChange}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="form-label">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-input"
                        value={editUserData.email}
                        onChange={handleEditUserChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="form-label">Role</label>
                      <select
                        id="role"
                        name="role"
                        className="form-input"
                        value={editUserData.role}
                        onChange={handleEditUserChange}
                        required
                      >
                        <option value="doctor">Doctor</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={editUserData.is_active}
                        onChange={handleEditUserChange}
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Active account
                      </label>
                    </div>
                    
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                        disabled={updateUserMutation.isLoading}
                      >
                        {updateUserMutation.isLoading ? 'Updating...' : 'Update User'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={() => {
                          setIsEditUserModalOpen(false);
                          setSelectedUser(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
