'use client';

import { useState, useEffect, ChangeEvent, FormEvent, Fragment ,useCallback} from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Mail,
  Phone,
  User,
  MapPin,
} from 'lucide-react';
import Swal from 'sweetalert2';
import ResponsiveSidebar from '@/components/ResponsiveSidebar'; // Assuming this path is correct
import { useAuth } from '@/context/AuthContext';
// --- Interfaces ---
interface ExternalAgency {
  id: number;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

// Initial form state for adding/editing
const initialFormState = {
  id: 0,
  name: '',
  address: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
};

// Simple Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
);

export default function ExternalAgenciesPage() {
  const [agencies, setAgencies] = useState<ExternalAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState(initialFormState);
  const { user } = useAuth();
  // --- Fetch Data ---
  const fetchAgencies = useCallback(async () => { 
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await fetch('/api/admin/external-agencies',{
            headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            }
        
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch external agencies');
      }
      const result = await response.json();
      // FIX: Ensure result.data is an array before setting state
      if (Array.isArray(result.data)) {
        setAgencies(result.data);
      } else {
        // Handle unexpected data format from API
        throw new Error('Invalid data format received from API. Expected an array for data.');
      }
    } catch (err: unknown) { // Explicitly type err as unknown
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถโหลดหน่วยงานภายนอกได้ (ข้อผิดพลาดที่ไม่รู้จัก)';
      setError(`Error fetching external agencies: ${errorMessage}`);
      console.error('Error fetching external agencies:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: `ไม่สามารถโหลดหน่วยงานภายนอกได้: ${errorMessage}`,
        confirmButtonText: 'ตกลง',
      });
      setAgencies([]); // Ensure agencies is always an empty array on error to prevent .length error
    } finally {
      setLoading(false);
    }
  }, [ user]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]); // Fetch agencies on component mount

  // --- Handlers for Form and Modal ---
  const openModal = (mode: 'add' | 'edit', agency?: ExternalAgency) => {
    setModalMode(mode);
    if (mode === 'edit' && agency) {
      setFormData({
        id: agency.id,
        name: agency.name,
        address: agency.address || '',
        contact_person: agency.contact_person || '',
        contact_email: agency.contact_email || '',
        contact_phone: agency.contact_phone || '',
      });
    } else {
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
      };

      let response;
      if (modalMode === 'add') {
        response = await fetch('/api/admin/external-agencies', {
          method: 'POST',
              headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
          body: JSON.stringify(dataToSubmit),
        });
      } else {
        response = await fetch('/api/admin/external-agencies', {
          method: 'PUT',
              headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
          body: JSON.stringify({ ...dataToSubmit, id: formData.id }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Operation failed');
      }

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: `หน่วยงานภายนอกถูก${modalMode === 'add' ? 'เพิ่ม' : 'อัปเดต'}เรียบร้อยแล้ว`,
        confirmButtonText: 'ตกลง',
      });
      closeModal();
      fetchAgencies(); // Refresh list
    } catch (err: unknown) { // Explicitly type err as unknown
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถดำเนินการได้ (ข้อผิดพลาดที่ไม่รู้จัก)';
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage,
        confirmButtonText: 'ตกลง',
      });
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "คุณจะไม่สามารถกู้คืนหน่วยงานนี้ได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/external-agencies', {
            method: 'DELETE',
                headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
            body: JSON.stringify({ id }),
          });

          

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Deletion failed');
          }

          Swal.fire('ลบสำเร็จ!', 'หน่วยงานถูกลบเรียบร้อยแล้ว', 'success');
          fetchAgencies(); // Refresh list
        } catch (err: unknown) { // Explicitly type err as unknown
          const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถลบหน่วยงานได้ (ข้อผิดพลาดที่ไม่รู้จัก)';
          Swal.fire('เกิดข้อผิดพลาด!', errorMessage, 'error');
          console.error('Deletion error:', err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <ResponsiveSidebar>
      <div >
        <div className="container mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดการหน่วยงานภายนอก</h1>

          {/* Action Bar: Add Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => openModal('add')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> เพิ่มหน่วยงานภายนอก
            </button>
          </div>

          {/* Loading and Error States */}
          {loading && (
            <div className="flex justify-center items-center py-4 text-blue-600">
              <Spinner />
              <span className="ml-2">กำลังโหลดข้อมูล...</span>
            </div> 
          )}
          {error && <div className="text-center py-4 text-red-600">เกิดข้อผิดพลาด: {error}</div>}

          {/* Agencies Table */}
          {!loading && !error && (
            <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อหน่วยงาน
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ติดต่อ
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เบอร์โทรศัพท์
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        ไม่พบหน่วยงานภายนอก
                      </td>
                    </tr>
                  ) : (
                    agencies.map((agency) => (
                      <tr key={agency.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {agency.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {agency.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {agency.contact_person || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {agency.contact_phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openModal('edit', agency)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                              title="แก้ไข"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(agency.id)}
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

        {/* Add/Edit Modal (HeroUI Dialog) */}
        <Transition appear show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
                      {modalMode === 'add' ? 'เพิ่มหน่วยงานภายนอกใหม่' : 'แก้ไขหน่วยงานภายนอก'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">ชื่อหน่วยงาน</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                            required
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <Building2 className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <textarea
                            name="address"
                            id="address"
                            rows={2}
                            value={formData.address}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          ></textarea>
                          <div className="pointer-events-none absolute top-2 right-0 flex items-center pr-3">
                            <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">ผู้ติดต่อ</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            name="contact_person"
                            id="contact_person"
                            value={formData.contact_person}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">อีเมลผู้ติดต่อ</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="email"
                            name="contact_email"
                            id="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์ผู้ติดต่อ</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="text"
                            name="contact_phone"
                            id="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end col-span-2 space-x-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus:visible:ring-blue-500 focus:visible:ring-offset-2"
                        >
                          {loading ? 'กำลังบันทึก...' : (modalMode === 'add' ? 'เพิ่ม' : 'บันทึก')}
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
