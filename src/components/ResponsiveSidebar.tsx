// src/components/ResponsiveSidebar.tsx
'use client'; // This component needs 'use client' because it uses useState, useEffect, and client-side hooks

import { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  FolderKanban,
  FileText,
  Upload,
  Users,
  Building2,
 // Settings,
  Menu,
  X,
  // ChevronDown,
  // ChevronUp,
  LogIn,
  LogOut,
  // Mail,
  // FilePlus,
  // ArrowRightLeft,
  BookText,
  UserRoundCog, // User icon for profile
  FileCheck,
  Building, // For department icon
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import usePathname here
import { useAuth } from '@/context/AuthContext'; // Make sure this path is correct
import Swal from 'sweetalert2'; // For alerts, if you want to use it here

// --- Spinner Component ---
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-white" />
);

// Define the type for a single navigation item
interface NavItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & React.RefAttributes<SVGSVGElement>>;
  current: boolean;
  adminOnly?: boolean; // Accessible by 'admin' role
  superUserOnly?: boolean; // Accessible by 'super_user' role (and by admin implicitly)
  children?: NavItem[]; // For nested navigation if needed
}

// Define navigation items
const navigation: NavItem[] = [
  // General links (visible to all authenticated users)
  {
    name: 'ภาพรวมระบบ',
    href: '/admin/dashboard',
    icon: FolderKanban,
    current: false,
  },
  {
    name: 'หนังสือรับ',
    href: '/docs/incoming',
    icon: FileText,
    current: false,
  },
  {
    name: 'หนังสือส่ง',
    href: '/outgoing-documents',
    icon: Upload,
    current: false,
  },
  {
    name: 'เอกสารลงทะเบียน',
    href: '/registered-documents',
    icon: BookText,
    current: false,
  },

  // Super User specific links (visible to super_user and admin)
  {
    name: 'จัดการหน่วยงานภายนอก',
    href: '/admin/external-agencies',
    icon: Building2,
    current: false,
    superUserOnly: true,
  },
  {
    name: 'จัดการหน่วยงานภายใน',
    href: '/admin/departments',
    icon: Building, // Icon for departments
    current: false,
    superUserOnly: true,
  },
  {
    name: 'จัดการประเภทเอกสาร',
    href: '/admin/document-types',
    icon: FileCheck,
    current: false,
    superUserOnly: true,
  },
  // Admin-only links (visible only to admin)
  {
    name: 'จัดการผู้ใช้งาน',
    href: '/admin/users',
    icon: Users,
    current: false,
    adminOnly: true,
  },
   {
    name: 'จัดการหน่วยงานภายนอก',
    href: '/admin/external-agencies',
    icon: Building2,
    current: false,
    adminOnly: true,
  },
  {
    name: 'จัดการหน่วยงานภายใน',
    href: '/admin/departments',
    icon: Building, // Icon for departments
    current: false,
    adminOnly: true,
  },
  {
    name: 'จัดการประเภทเอกสาร',
    href: '/admin/document-types',
    icon: FileCheck,
    current: false,
    adminOnly: true,
  },
  // Note: 'จัดการประเภทเอกสาร', 'จัดการหน่วยงานภายนอก', 'จัดการหน่วยงานภายใน'
  // are now handled by 'superUserOnly' for both super_user and admin.
  // If you want strictly admin-only versions of these, you would need to duplicate them
  // and ensure their superUserOnly is false and adminOnly is true.
  // For now, I'm assuming if it's superUserOnly, admin also sees it.
  // If you need truly *exclusive* admin-only, please specify.
  // {
  //   name: 'การตั้งค่าระบบ',
  //   href: '/admin/settings',
  //   icon: Settings,
  //   current: false,
  //   adminOnly: true,
  // },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ResponsiveSidebar({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    // Define paths that do NOT require authentication
    const publicPaths = ['/auth/login', '/auth/register', '/auth/reset-password'];

    // If auth state has finished loading AND user is not authenticated
    // AND the current path is NOT one of the public paths
    if (!isLoading && !isAuthenticated && !publicPaths.includes(pathname)) {
      router.replace('/auth/login'); // Redirect to login page if not authenticated
    }
  }, [isAuthenticated, isLoading, router, pathname]); // Added pathname to dependencies

  // Filter navigation items based on user role
  const filteredNavItems = useMemo(() => {
    if (!user) {
      // If no user (not authenticated or still loading), return only general items
      return navigation.filter(item => !item.adminOnly && !item.superUserOnly);
    }

    return navigation.filter(item => {
      if (user.role === 'admin') {
        // Admin sees all items
        return true;
      }
      if (user.role === 'super_user') {
        // Super-user sees general items and superUserOnly items, but NOT adminOnly items
        return !item.adminOnly; // This correctly includes superUserOnly items and excludes adminOnly
      }
      // Regular user sees only general items
      return !item.adminOnly && !item.superUserOnly;
    }).map(item => ({
      ...item,
      current: pathname === item.href,
    }));
  }, [user, pathname]); // Removed isLoading from dependencies

  // Separate navigation items for rendering based on their access level
  const mainNav = filteredNavItems.filter(item => !item.adminOnly && !item.superUserOnly);
  // superUserNavSection: Items with superUserOnly flag, and user is super_user (not admin)
  const superUserNavSection = filteredNavItems.filter(item => item.superUserOnly && user?.role === 'super_user');
  // adminNavSection: Items with adminOnly flag, and user is admin
  const adminNavSection = filteredNavItems.filter(item => item.adminOnly && user?.role === 'admin');


  const handleLogout = async () => {
    try {
      await logout(); // Call the logout function from AuthContext
      // AuthContext's logout function now handles the router.push('/auth/login')
    } catch (error) {
      console.error('Logout failed:', error);
      Swal.fire({
        icon: 'error',
        title: 'ออกจากระบบไม่สำเร็จ',
        text: 'เกิดข้อผิดพลาดในการออกจากระบบ โปรดลองอีกครั้ง',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Spinner />
        <span className="ml-2 text-blue-600">กำลังโหลดข้อมูลระบบ...</span>
      </div>
    );
  }

  // Only render sidebar content if authenticated or on a public path
  const publicPaths = ['/auth/login', '/auth/register', '/auth/reset-password'];
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    return null; // Or a loading spinner, or redirecting...
  }

  return (
    <>
      <div>
        {/* Mobile sidebar */}
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">Close sidebar</span>
                        <X className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  {/* Sidebar content for mobile */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-600 px-6 pb-4">
                    <div className="flex h-16 shrink-0 items-center">
                      <span className="ml-2 text-white text-xl font-bold">เอกสารราชการ</span>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {mainNav.map((item) => (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className={classNames(
                                    item.current
                                      ? 'bg-blue-700 text-white'
                                      : 'text-blue-100 hover:text-white hover:bg-blue-700',
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                  )}
                                  onClick={() => setSidebarOpen(false)} // Close sidebar on link click
                                >
                                  <item.icon
                                    className={classNames(
                                      item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                                      'h-6 w-6 shrink-0'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        {superUserNavSection.length > 0 && (
                          <li>
                            <div className="text-xs font-semibold leading-6 text-blue-200">
                              จัดการข้อมูล (หัวหน้างาน)
                            </div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                              {superUserNavSection.map((item) => (
                                <li key={item.name}>
                                  <Link
                                    href={item.href}
                                    className={classNames(
                                      item.current
                                        ? 'bg-blue-700 text-white'
                                        : 'text-blue-100 hover:text-white hover:bg-blue-700',
                                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                    )}
                                    onClick={() => setSidebarOpen(false)} // Close sidebar on link click
                                  >
                                    <item.icon
                                      className={classNames(
                                        item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                                        'h-6 w-6 shrink-0'
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                        {adminNavSection.length > 0 && (
                          <li>
                            <div className="text-xs font-semibold leading-6 text-blue-200">
                              ตั้งค่าระบบ (ผู้ดูแลระบบ)
                            </div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                              {adminNavSection.map((item) => (
                                <li key={item.name}>
                                  <Link
                                    href={item.href}
                                    className={classNames(
                                      item.current
                                        ? 'bg-blue-700 text-white'
                                        : 'text-blue-100 hover:text-white hover:bg-blue-700',
                                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                    )}
                                    onClick={() => setSidebarOpen(false)} // Close sidebar on link click
                                  >
                                    <item.icon
                                      className={classNames(
                                        item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                                        'h-6 w-6 shrink-0'
                                      )}
                                      aria-hidden="true"
                                    />
                                    {item.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                        <li className="mt-auto">
                          {isAuthenticated ? (
                            <>
                              {/* Improved User Profile Display */}
                              <div className="flex items-center gap-x-3 py-3 px-4 rounded-md bg-blue-700 hover:bg-blue-800 transition-colors duration-200">
                                <UserRoundCog className="h-7 w-7 shrink-0 text-blue-100" /> {/* Larger icon, slightly lighter blue */}
                                <div className="flex flex-col">
                                  <span className="text-base font-bold text-white"> {/* Larger, bolder username */}
                                    {user?.username}
                                  </span>
                                  <span className="text-xs text-blue-100 opacity-80"> {/* Slightly lighter, more subtle department */}
                                    ({user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'super_user' ? 'หัวหน้างาน' : 'ผู้ใช้งาน'})
                                  </span>
                                  {user?.department_name && (
                                    <span className="text-xs text-blue-100 opacity-80">
                                      แผนก: {user.department_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={handleLogout}
                                className="group -mx-2 flex w-full items-center justify-center gap-x-3 rounded-full px-4 py-2 text-base font-semibold leading-6 bg-red-600 text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 mt-2"
                              >
                                <LogOut className="h-5 w-5 shrink-0 text-white" /> {/* Smaller icon for better alignment */}
                                ออกจากระบบ
                              </button>
                            </>
                          ) : (
                            <Link
                              href="/auth/login"
                              className="group -mx-2 flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-blue-100 hover:bg-blue-700 hover:text-white"
                            >
                              <LogIn className="h-6 w-6 shrink-0 text-blue-200 group-hover:text-white" />
                              เข้าสู่ระบบ
                            </Link>
                          )}
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          {/* Sidebar content for desktop */}
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-600 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <span className="ml-2 text-white text-xl font-bold">เอกสารราชการ</span>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {mainNav.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={classNames(
                            item.current
                              ? 'bg-blue-700 text-white'
                              : 'text-blue-100 hover:text-white hover:bg-blue-700',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={classNames(
                              item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                              'h-6 w-6 shrink-0'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                {superUserNavSection.length > 0 && (
                  <li>
                    <div className="text-xs font-semibold leading-6 text-blue-200">
                      จัดการข้อมูล (หัวหน้างาน)
                    </div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {superUserNavSection.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={classNames(
                              item.current
                                ? 'bg-blue-700 text-white'
                                : 'text-blue-100 hover:text-white hover:bg-blue-700',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
                {adminNavSection.length > 0 && (
                  <li>
                    <div className="text-xs font-semibold leading-6 text-blue-200">
                      ตั้งค่าระบบ (ผู้ดูแลระบบ)
                    </div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {adminNavSection.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={classNames(
                              item.current
                                ? 'bg-blue-700 text-white'
                                : 'text-blue-100 hover:text-white hover:bg-blue-700',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                          >
                            <item.icon
                              className={classNames(
                                item.current ? 'text-white' : 'text-blue-200 group-hover:text-white',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
                <li className="mt-auto">
                  {isAuthenticated ? (
                    <>
                      {/* Improved User Profile Display */}
                      <div className="flex items-center gap-x-3 py-3 px-4 rounded-md bg-blue-700 hover:bg-blue-800 transition-colors duration-200">
                        <UserRoundCog className="h-7 w-7 shrink-0 text-blue-100" /> {/* Larger icon, slightly lighter blue */}
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-white"> {/* Larger, bolder username */}
                            {user?.username}
                          </span>
                          <span className="text-xs text-blue-100 opacity-80"> {/* Slightly lighter, more subtle department */}
                            ({user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'super_user' ? 'หัวหน้างาน' : 'ผู้ใช้งาน'})
                          </span>
                          {user?.department_name && (
                            <span className="text-xs text-blue-100 opacity-80">
                              แผนก: {user.department_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="group -mx-2 flex w-full items-center justify-center gap-x-3 rounded-full px-4 py-2 text-base font-semibold leading-6 bg-red-600 text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200 mt-2"
                      >
                        <LogOut className="h-5 w-5 shrink-0 text-white" /> {/* Icon color white */}
                        ออกจากระบบ
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="group -mx-2 flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-blue-100 hover:bg-blue-700 hover:text-white"
                    >
                      <LogIn className="h-6 w-6 shrink-0 text-blue-200 group-hover:text-white" />
                      เข้าสู่ระบบ
                    </Link>
                  )}
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          {/* Top bar for mobile/tablet */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div
              className="h-6 w-px bg-gray-900/10 lg:hidden"
              aria-hidden="true"
            />

            <div className="flex flex-1 justify-end items-center gap-x-4 self-stretch lg:gap-x-6">
              <h1 className="text-xl font-semibold text-gray-900">
                ระบบจัดการเอกสาร
              </h1>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}