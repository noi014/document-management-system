'use client';

import { useEffect, useState, Fragment, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import {
  Pencil,
  Trash2,
  Loader2, // For loading spinner
  User, // For username input
  Mail, // For email input
  Building, // For department select
  UserRoundCog, // For role select
} from 'lucide-react';

// Define interfaces for better type safety
interface Department {
  id: number;
  name: string;
}

interface UserData { // Renamed from User to UserData to avoid conflict with `user` from useAuth
  id: number;
  username: string;
  email: string | null;
  department_name: string; // The name of the department (from JOIN)
  department_id: number; // The ID of the department (from JOIN)
  role: 'admin' | 'super_user' | 'user';
}

// Simple Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
);

export default function UserManagementPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingPage, setLoadingPage] = useState(true); // Overall page loading
  const [isSubmitting, setIsSubmitting] = useState(false); // For modal submission loading

  // --- Effect to handle authentication and fetch initial data ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!authLoading) {
        // Updated authorization check: allow 'admin' or 'super-user'
        if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_user')) {
          router.push('/auth/login'); // Redirect to login if not authenticated or not authorized
          return; // Stop further execution
        } else {
          try {
            // Fetch both departments and users in parallel
            const requestHeaders: Record<string, string> = {
              'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
            };

            const [departmentsResponse, usersResponse] = await Promise.all([
              fetch('/api/admin/departments', { headers: requestHeaders }),
              fetch('/api/admin/users', { headers: requestHeaders }),
            ]);

            // Handle departments response
            if (departmentsResponse.ok) {
              const departmentsResult = await departmentsResponse.json();
              if (Array.isArray(departmentsResult.data)) { // Expecting { data: [...] }
                setDepartments(departmentsResult.data);
              } else if (Array.isArray(departmentsResult)) { // Fallback for direct array
                setDepartments(departmentsResult);
              }
              else {
                console.error('API response for departments did not contain an array in "data" property or was not a direct array:', departmentsResult);
                setError('รูปแบบข้อมูลแผนกจากเซิร์ฟเวอร์ไม่ถูกต้อง');
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: 'รูปแบบข้อมูลแผนกจากเซิร์ฟเวอร์ไม่ถูกต้อง', confirmButtonText: 'ตกลง' });
              }
            } else {
              const errData = await departmentsResponse.json();
              setError(errData.message || 'ไม่สามารถดึงข้อมูลแผนกได้');
              Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: errData.message || 'ไม่สามารถดึงข้อมูลแผนกได้', confirmButtonText: 'ตกลง' });
            }

            // Handle users response
            if (usersResponse.ok) {
              const usersResult = await usersResponse.json();
              if (Array.isArray(usersResult.data)) { // Expecting { data: [...] }
                setUsers(usersResult.data);
              } else if (Array.isArray(usersResult)) { // Fallback for direct array
                setUsers(usersResult);
              }
              else {
                console.error('API response for users did not contain an array in "data" property or was not a direct array:', usersResult);
                setError('รูปแบบข้อมูลผู้ใช้งานจากเซิร์ฟเวอร์ไม่ถูกต้อง');
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: 'รูปแบบข้อมูลผู้ใช้งานจากเซิร์ฟเวอร์ไม่ถูกต้อง', confirmButtonText: 'ตกลง' });
              }
            } else {
              const errData = await usersResponse.json();
              setError(errData.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
              Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: errData.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', confirmButtonText: 'ตกลง' });
            }
          } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
            console.error('Error fetching initial data:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + errorMessage);
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
          } finally {
            setLoadingPage(false); // Set loading to false after all data is fetched
          }
        }
      }
    };

    loadInitialData();
  }, [isAuthenticated, user, authLoading, router]);

  // --- Function to refetch users (e.g., after edit/delete) ---
  const refetchUsers = async () => {
    setError(null); // Clear previous errors
    if (!isAuthenticated || !user) {
      setError('ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบด้วยสิทธิ์ผู้ดูแลระบบ');
      return;
    }
    try {
      const requestHeaders: Record<string, string> = {
        'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
      };
      const response = await fetch('/api/admin/users', { headers: requestHeaders });
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data)) { // Expecting { data: [...] }
          setUsers(result.data);
        } else if (Array.isArray(result)) { // Fallback for direct array
          setUsers(result);
        } else {
          console.error('Refetch users API response did not contain an array in "data" property or was not a direct array:', result);
          setUsers([]); // Fallback to empty array
          setError('รูปแบบข้อมูลผู้ใช้งานจากเซิร์ฟเวอร์ไม่ถูกต้อง');
        }
      } else {
        const errData = await response.json();
        setError(errData.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
        Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: errData.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', confirmButtonText: 'ตกลง' });
      }
    } catch (err) {
      console.error('Error refetching users:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด!', text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
    }
  };

  // --- Handler for Edit button click ---
  const handleEditClick = (userToEdit: UserData) => {
    setEditingUser({ ...userToEdit });
    setError(null); // Clear previous errors
    setIsModalOpen(true);
  };

  // --- Handler for Delete button click ---
  const handleDeleteClick = async (id: number) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณจะไม่สามารถกู้คืนผู้ใช้งานนี้ได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSubmitting(true); // Show loading during deletion
        if (!isAuthenticated || !user) {
          setError('ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ');
          setIsSubmitting(false);
          return;
        }
        try {
          const response = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
            },
            body: JSON.stringify({ id }),
          });

          if (response.ok) {
            Swal.fire('ลบสำเร็จ!', 'ผู้ใช้งานถูกลบเรียบร้อยแล้ว', 'success');
            refetchUsers(); // Refresh the list
          } else {
            const data = await response.json();
            setError(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
            Swal.fire('เกิดข้อผิดพลาด!', data.message || 'ไม่สามารถลบผู้ใช้งานได้', 'error');
          }
        } catch (err) {
          console.error('Error deleting user:', err);
          setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
          Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // --- Handler for saving user changes in modal ---
  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true); // Show loading during submission

    if (!editingUser) {
      setError('ข้อมูลผู้ใช้งานไม่ถูกต้อง');
      setIsSubmitting(false);
      return;
    }

    if (!editingUser.username.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้งาน');
      setIsSubmitting(false);
      return;
    }

    if (typeof editingUser.department_id !== 'number' || isNaN(editingUser.department_id)) {
      setError('กรุณาเลือกแผนกที่ถูกต้อง');
      setIsSubmitting(false);
      return;
    }

    if (!isAuthenticated || !user) {
      setError('ไม่ได้รับอนุญาต: กรุณาเข้าสู่ระบบ');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
        }, 
        body: JSON.stringify({
          id: editingUser.id,
          username: editingUser.username.trim(),
          email: editingUser.email?.trim() || null, // Ensure email is trimmed or null
          department_id: editingUser.department_id, // Send department_id
          role: editingUser.role,
        }),
      });

      if (response.ok) {
        Swal.fire('อัปเดตสำเร็จ!', 'ข้อมูลผู้ใช้งานถูกอัปเดตเรียบร้อยแล้ว', 'success');
        setIsModalOpen(false);
        setEditingUser(null);
        refetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.message || 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้งาน');
        Swal.fire('เกิดข้อผิดพลาด!', data.message || 'ไม่สามารถอัปเดตผู้ใช้งานได้', 'error');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Conditional rendering for loading and unauthorized access ---
  // This block will now check for both 'admin' and 'super-user' roles
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_user')) {
    return (
      <ResponsiveSidebar>
        <div className="flex justify-center items-center h-screen text-red-600">
          <p>คุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้</p>
        </div>
      </ResponsiveSidebar>
    );
  }

  return (
    <ResponsiveSidebar>
      <div className="min-h-screen">
        <div className="container mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดการผู้ใช้งาน</h1>


          {/* Loading and Error States */}
          {(authLoading || loadingPage) && ( // Combined loading condition
            <div className="flex justify-center items-center py-4 text-blue-600">
              <Spinner />
              <span className="ml-2">กำลังโหลดข้อมูล...</span>
            </div>
          )}
          {/* Error Message Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {/* Users Table */}
           {!loadingPage && !error && (
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อผู้ใช้งาน
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    อีเมล
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แผนก
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สิทธิ์
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      ไม่พบข้อมูลผู้ใช้งาน
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {u.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {u.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {u.department_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {u.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                            title="แก้ไข"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                            title="ลบ"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Edit User Modal (Headless UI Dialog) */}
        <Transition appear show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 border-b pb-3 mb-4"
                    >
                      แก้ไขผู้ใช้งาน
                    </Dialog.Title>
                    <form onSubmit={handleSaveUser} className="space-y-4">
                      <div>
                        <label htmlFor="editUsername" className="block text-sm font-medium text-gray-700">
                          ชื่อผู้ใช้งาน
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            id="editUsername"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                            value={editingUser?.username || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)}
                            required
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700">
                          อีเมล
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="email"
                            id="editEmail"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                            value={editingUser?.email || ''}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="editDepartment" className="block text-sm font-medium text-gray-700">
                          แผนก
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          {departments.length > 0 ? (
                            <select
                              id="editDepartment"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                              value={editingUser?.department_id || ''}
                              onChange={(e) =>
                                setEditingUser(prev => prev ? { ...prev, department_id: parseInt(e.target.value) } : null)
                              }
                              required
                            >
                              <option value="">-- เลือกแผนก --</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-red-500 text-sm">ไม่พบข้อมูลแผนก</p>
                          )}
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <Building className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="editRole" className="block text-sm font-medium text-gray-700">
                          สิทธิ์
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <select
                            id="editRole"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                            value={editingUser?.role || 'user'}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as 'admin'| 'super_user'| 'user' } : null)}
                            required
                          >
                            <option value="user">User</option>
                            <option value="super_user">Super-User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <UserRoundCog className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                      <div className="mt-4 flex justify-end space-x-3">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                          onClick={() => { setIsModalOpen(false); setError(null); setEditingUser(null); }} // Clear state on close
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus:visible:ring-blue-500 focus:visible:ring-offset-2"
                          disabled={isSubmitting} // Disable button during submission
                        >
                          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </ResponsiveSidebar>
  );
}
