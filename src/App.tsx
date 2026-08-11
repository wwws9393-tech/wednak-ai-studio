import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HallCard } from './components/HallCard';
import { ServiceProviderCard } from './components/ServiceProviderCard';
import { PostCard } from './components/PostCard';
import { HallDetailsModal } from './components/HallDetailsModal';
import { ServiceProviderDetailsModal } from './components/ServiceProviderDetailsModal';
import { BookingModal } from './components/BookingModal';
import { BookingDetailsModal } from './components/BookingDetailsModal';
import { BookingsView } from './components/BookingsView';
import { FavoritesView } from './components/FavoritesView';
import { ComplaintsView } from './components/ComplaintsView';
import { ExploreView } from './components/ExploreView';
import { SearchView } from './components/SearchView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { LegalSupportModals } from './components/LegalSupportModals';
import { OwnerHomeView } from './components/OwnerHomeView';
import { ServiceProviderHomeView } from './components/ServiceProviderHomeView';
import { AdminHomeView } from './components/AdminHomeView';
import { AuthModal } from './components/AuthModal';

import { INITIAL_HALLS } from './data/halls';
import { INITIAL_SERVICE_PROVIDERS } from './data/serviceProviders';
import { INITIAL_POSTS } from './data/posts';
import { fetchUserFromFirestore, saveUserToFirestore, INITIAL_FIRESTORE_USERS, GUEST_ANONYMOUS_USER } from './data/usersDatabase';
import { Hall, ServiceProvider, FeedPost, Booking, Complaint, AppNotification, UserProfile, AccountType } from './types';
import { Building2, Camera, Sparkles, MapPin, ArrowLeft, Heart, Search, Calendar, ShieldAlert } from 'lucide-react';

const CITIES = ['جميع المحافظات', 'بغداد', 'أربيل', 'البصرة', 'النجف', 'كربلاء', 'الموصل', 'السليمانية'];

export function App() {
  // 1. Core State & Local Persistence
  const [halls, setHalls] = useState<Hall[]>(INITIAL_HALLS);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(INITIAL_SERVICE_PROVIDERS);
  const [posts, setPosts] = useState<FeedPost[]>(INITIAL_POSTS);

  const [selectedCity, setSelectedCity] = useState<string>('جميع المحافظات');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('wednak_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return GUEST_ANONYMOUS_USER;
  });

  useEffect(() => {
    localStorage.setItem('wednak_user_profile', JSON.stringify(currentUser));

    // Log required auth gate debug trace
    let chosenRoute = 'CustomerHome';
    if (currentUser.accountType === 'زبون') chosenRoute = 'CustomerHome';
    else if (currentUser.accountType === 'صاحب قاعة') chosenRoute = 'OwnerHome';
    else if (currentUser.accountType === 'مزود خدمة') chosenRoute = 'ServiceProviderHome';
    else if (currentUser.accountType === 'مدير Admin') chosenRoute = 'AdminHome';

    console.log(`[AuthGate Debug] uid الحالي: ${currentUser.id}`);
    console.log(`[AuthGate Debug] accountType المقروء من Firestore: "${currentUser.accountType}"`);
    console.log(`[AuthGate Debug] route الذي تم اختياره: "${chosenRoute}"`);
  }, [currentUser]);

  // Favorites - strictly scoped per currentUser.id to prevent cross-account leakage
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      setFavoriteIds([]);
      return;
    }
    try {
      const userFavKey = `wednak_favorites_${currentUser.id}`;
      const saved = localStorage.getItem(userFavKey);
      if (saved) {
        setFavoriteIds(JSON.parse(saved));
      } else {
        // Default initial favorites for guest user only
        if (currentUser.id === 'user-guest-101') {
          setFavoriteIds(['hall-1', 'provider-1']);
        } else {
          setFavoriteIds([]);
        }
      }
    } catch {
      setFavoriteIds([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      const userFavKey = `wednak_favorites_${currentUser.id}`;
      localStorage.setItem(userFavKey, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds, currentUser?.id]);

  // Liked Posts
  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wednak_liked_posts');
      return saved ? JSON.parse(saved) : ['post-1'];
    } catch {
      return ['post-1'];
    }
  });

  useEffect(() => {
    localStorage.setItem('wednak_liked_posts', JSON.stringify(likedPostIds));
  }, [likedPostIds]);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('wednak_bookings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'WED-1001',
        itemType: 'hall',
        itemId: 'hall-1',
        itemName: 'قاعة الملكة الفاخرة',
        itemLocation: 'بغداد - الجادرية',
        itemImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
        date: '2026-09-15',
        timeSlot: 'مسائي (6:00 م - 11:00 م)',
        guests: 350,
        totalPrice: 3500000,
        depositAmount: 500000,
        notes: 'نرغب بحجز كوشة ملكية باللون الذهبي',
        status: 'مقبول',
        createdAt: 'قبل 3 أيام',
        customerName: 'علي الفتلاوي',
        customerPhone: '07701122334',
        customerId: 'user-guest-101',
        ownerId: 'owner-1',
      },
      {
        id: 'WED-1002',
        itemType: 'provider',
        itemId: 'provider-1',
        itemName: 'استوديو العريس الملكي للتصوير',
        itemLocation: 'بغداد - المنصور',
        itemImage: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
        date: '2026-09-15',
        timeSlot: 'مسائي (6:00 م - 11:00 م)',
        totalPrice: 600000,
        depositAmount: 120000,
        notes: 'تغطية طيران Dron وألبوم حراري',
        status: 'قيد المراجعة',
        createdAt: 'قبل ساعتين',
        customerName: 'علي الفتلاوي',
        customerPhone: '07701122334',
        customerId: 'user-guest-101',
        ownerId: 'provider-user-1',
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('wednak_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Complaints
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = localStorage.getItem('wednak_complaints');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'CMP-501',
        userId: 'user-guest-101',
        userName: 'علي الفتلاوي',
        userPhone: '07701122334',
        subject: 'استفسار عن موعد دفع بقية المبلغ',
        relatedItemName: 'قاعة الملكة الفاخرة',
        description: 'أود الاستفسار هل يدفع المبلغ المتبقي قبل الحفلة بيوم أو في نفس يوم الحفلة؟',
        status: 'تمت المعالجة',
        createdAt: 'قبل يومين',
        adminReply: 'أهلاً بك! يدفع المبلغ المتبقي عند استلام القاعة يوم الحفلة.',
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('wednak_complaints', JSON.stringify(complaints));
  }, [complaints]);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('wednak_notifications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'notif-1',
        title: 'تم قبول حجزك بنجاح! 🎉',
        subtitle: 'قاعة الملكة الفاخرة وافقت على حجزك ليوم 2026-09-15. نتمنى لك ليلة زفاف مباركة!',
        date: 'قبل يومين',
        type: 'booking',
        targetBookingId: 'WED-1001',
        read: false,
      },
      {
        id: 'notif-2',
        title: 'عرض جديد في بغداد 🏷️',
        subtitle: 'خصم 15% على تصوير العرائس من استوديو العريس الملكي عند الحجز هذا الأسبوع.',
        date: 'قبل 5 ساعات',
        type: 'offer',
        targetProviderId: 'provider-1',
        read: false,
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('wednak_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Modals Active State
  const [selectedHallForModal, setSelectedHallForModal] = useState<Hall | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<ServiceProvider | null>(null);
  const [bookingItemForModal, setBookingItemForModal] = useState<{ type: 'hall'; data: Hall } | { type: 'provider'; data: ServiceProvider } | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'support' | null>(null);

  // 2. Handlers & Business Logic

  const handleToggleFavorite = (id: string, type: 'hall' | 'provider') => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTogglePostLike = (postId: string) => {
    setLikedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  // Account Type Change Handler
  const handleChangeAccountType = async (newType: AccountType) => {
    // 1. Clear any cached role to prevent inheritance conflicts
    localStorage.removeItem('wednak_cached_role');
    localStorage.removeItem('wednak_account_type');

    const updatedProfile: UserProfile = {
      ...currentUser,
      accountType: newType,
    };

    if (newType === 'صاحب قاعة') {
      updatedProfile.ownedHallId = 'hall-1';
    } else if (newType === 'مزود خدمة') {
      updatedProfile.ownedProviderId = 'provider-1';
    }

    setCurrentUser(updatedProfile);
    await saveUserToFirestore(updatedProfile);
  };

  // Login Success Handler from AuthModal
  const handleLoginSuccess = (userDoc: UserProfile) => {
    // 1. Wipe cached role
    localStorage.removeItem('wednak_cached_role');
    localStorage.removeItem('wednak_account_type');

    // 2. Set active user profile fetched from Firestore
    setCurrentUser(userDoc);
    setCurrentTab('home');
  };

  // Logout Handler
  const handleLogout = () => {
    // 1. Wipe cached roles and user data
    localStorage.removeItem('wednak_cached_role');
    localStorage.removeItem('wednak_account_type');
    localStorage.removeItem('wednak_user_profile');

    // 2. Reset user state to clean guest
    setCurrentUser(GUEST_ANONYMOUS_USER);

    setIsAuthModalOpen(true);
  };

  const handleCreateBooking = (bookingData: {
    itemType: 'hall' | 'provider';
    itemId: string;
    itemName: string;
    itemLocation: string;
    itemImage: string;
    date: string;
    timeSlot: string;
    guests?: number;
    totalPrice: number;
    depositAmount: number;
    notes: string;
    customerName: string;
    customerPhone: string;
    ownerId?: string;
  }) => {
    // 1. Guard against Self Booking
    const isSelfBooking =
      bookingData.ownerId === currentUser.id ||
      (bookingData.itemType === 'hall' && currentUser.ownedHallId === bookingData.itemId) ||
      (bookingData.itemType === 'provider' && currentUser.ownedProviderId === bookingData.itemId);

    if (isSelfBooking) {
      alert('خطأ: لا يمكنك حجز قناتك أو خدمتك بنفسك!');
      return;
    }

    // 2. Guard against Double Booking (Accepted slot overlap on same item and date)
    const hasOverlap = bookings.some(
      (b) =>
        b.itemId === bookingData.itemId &&
        b.date === bookingData.date &&
        b.timeSlot === bookingData.timeSlot &&
        b.status === 'مقبول'
    );

    if (hasOverlap) {
      alert('عذراً، هذا الموعد محجوز بالكامل مقدماً لهذا اليوم. يرجى اختيار تاريخ أو فترة زمنية أخرى.');
      return;
    }

    const newBookingId = `WED-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      id: newBookingId,
      ...bookingData,
      status: 'قيد المراجعة',
      createdAt: 'الآن',
      customerId: currentUser.id,
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Push instant notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'تم إرسال طلب الحجز 📩',
      subtitle: `تم تقديم طلب حجز ${bookingData.itemName} بتاريخ ${bookingData.date}. سنوافيكم بالرد فوراً.`,
      date: 'الآن',
      type: 'booking',
      targetBookingId: newBookingId,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Redirect to Bookings View
    setCurrentTab('bookings');
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'ملغي' } : b))
    );
  };

  // Hall & Provider Owners Update Actions
  const handleUpdateHall = (updatedHall: Hall) => {
    setHalls((prev) => prev.map((h) => (h.id === updatedHall.id ? updatedHall : h)));
  };

  const handleUpdateProvider = (updatedProvider: ServiceProvider) => {
    setServiceProviders((prev) => prev.map((p) => (p.id === updatedProvider.id ? updatedProvider : p)));
  };

  const handleUpdateBookingStatus = (bookingId: string, newStatus: Booking['status']) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);

    // Double booking guard when accepting
    if (newStatus === 'مقبول' && targetBooking) {
      const hasConflict = bookings.some(
        (b) =>
          b.id !== bookingId &&
          b.itemId === targetBooking.itemId &&
          b.date === targetBooking.date &&
          b.timeSlot === targetBooking.timeSlot &&
          b.status === 'مقبول'
      );
      if (hasConflict) {
        alert('لا يمكن قبول هذا الحجز لأن هناك حجزاً آخر مقبولاً بالفعل في نفس التاريخ والوقت!');
        return;
      }
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    // Notify customer
    if (targetBooking) {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: newStatus === 'مقبول' ? 'تم قبول حجزك بنجاح! 🎉' : 'تم تحديث حالة الحجز ℹ️',
        subtitle: `تمت تحديث حالة حجز ${targetBooking.itemName} بتاريخ ${targetBooking.date} إلى (${newStatus}).`,
        date: 'الآن',
        type: 'booking',
        targetBookingId: bookingId,
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const handleCreatePost = (postData: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      ...postData,
      likesCount: 1,
      sharesCount: 0,
      createdAt: 'الآن',
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleCreateComplaint = (complaintData: {
    subject: string;
    relatedItemName?: string;
    description: string;
    userPhone: string;
  }) => {
    const newComplaint: Complaint = {
      id: `CMP-${Math.floor(500 + Math.random() * 500)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: complaintData.userPhone,
      subject: complaintData.subject,
      relatedItemName: complaintData.relatedItemName,
      description: complaintData.description,
      status: 'قيد المراجعة',
      createdAt: 'الآن',
    };

    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const handleUpdateComplaintStatus = (
    complaintId: string,
    status: Complaint['status'],
    adminReply?: string
  ) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, status, adminReply } : c))
    );
  };

  // Notification Target Navigation
  const handleOpenNotificationTarget = (notif: AppNotification) => {
    if (notif.targetBookingId) {
      const foundBooking = bookings.find((b) => b.id === notif.targetBookingId);
      if (foundBooking) {
        // Access guard: only requester, target owner, or admin can open details
        const isParty =
          foundBooking.customerId === currentUser.id ||
          foundBooking.ownerId === currentUser.id ||
          currentUser.ownedHallId === foundBooking.itemId ||
          currentUser.ownedProviderId === foundBooking.itemId ||
          currentUser.accountType === 'مدير Admin';

        if (!isParty) {
          alert('تنبيه: لا تملك صلاحية الوصول لتفاصيل هذا الحجز.');
          return;
        }

        setSelectedBookingForDetails(foundBooking);
        return;
      }
    }
    if (notif.targetHallId) {
      const foundHall = halls.find((h) => h.id === notif.targetHallId);
      if (foundHall) {
        setSelectedHallForModal(foundHall);
        return;
      }
    }
    if (notif.targetProviderId) {
      const foundProvider = serviceProviders.find((sp) => sp.id === notif.targetProviderId);
      if (foundProvider) {
        setSelectedProviderForModal(foundProvider);
        return;
      }
    }
    setCurrentTab('bookings');
  };

  // Scoped bookings for currentUser to guarantee no data leakage between accounts
  const userBookings = bookings.filter((b) => {
    if (currentUser.accountType === 'مدير Admin') return true;
    if (currentUser.accountType === 'صاحب قاعة') {
      return b.ownerId === currentUser.id || b.itemId === currentUser.ownedHallId;
    }
    if (currentUser.accountType === 'مزود خدمة') {
      return b.ownerId === currentUser.id || b.itemId === currentUser.ownedProviderId;
    }
    return b.customerId === currentUser.id;
  });

  // Filtered lists for Home
  const displayedHalls = halls.filter(
    (h) => selectedCity === 'جميع المحافظات' || h.city === selectedCity
  );

  const displayedProviders = serviceProviders.filter(
    (p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-['Cairo',sans-serif] pb-24 lg:pb-12 dir-rtl">
      
      {/* App Main Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        cities={CITIES}
        favoritesCount={favoriteIds.length}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        currentAccountType={currentUser.accountType}
        onChangeAccountType={handleChangeAccountType}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main View Router */}
      <main>
        {currentTab === 'home' && (
          <>
            {/* 1. Owner Home View for "صاحب قاعة" */}
            {currentUser.accountType === 'صاحب قاعة' ? (
              <OwnerHomeView
                currentUser={currentUser}
                halls={halls}
                bookings={bookings}
                onUpdateHall={handleUpdateHall}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onCreatePost={handleCreatePost}
              />
            ) : currentUser.accountType === 'مزود خدمة' ? (
              /* 2. Service Provider Home View for "مزود خدمة" */
              <ServiceProviderHomeView
                currentUser={currentUser}
                serviceProviders={serviceProviders}
                bookings={bookings}
                onUpdateProvider={handleUpdateProvider}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onCreatePost={handleCreatePost}
              />
            ) : currentUser.accountType === 'مدير Admin' ? (
              /* 3. Admin Home View for "مدير Admin" */
              <AdminHomeView
                currentUser={currentUser}
                complaints={complaints}
                bookings={bookings}
                onUpdateComplaintStatus={handleUpdateComplaintStatus}
              />
            ) : (
              /* 4. Customer Home View for "زبون" */
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                
                {/* Hero Banner with Iraqi Wedding Vibe */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 text-white p-6 sm:p-10 shadow-xl border border-amber-400/20">
                  <div className="relative z-10 max-w-2xl space-y-3">
                    <span className="bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block shadow-sm">
                      تطبيق Wedنك ويدنك 💍 (Customer Home)
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black leading-tight text-amber-100">
                      احجز قاعة ليلة العمر وأرقى خدمات الزفاف في العراق
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium">
                      استكشف أفضل قاعات المناسبات، المصورين، الكوشات، وسيارات العرايس في {selectedCity === 'جميع المحافظات' ? 'كافة المحافظات' : selectedCity}. احجز موعدك وضمن عربونك بكل أمان.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => setCurrentTab('search')}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        id="hero-search-btn"
                      >
                        <Search className="w-4 h-4" />
                        <span>البحث السريع عن قاعة</span>
                      </button>

                      <button
                        onClick={() => setCurrentTab('explore')}
                        className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center gap-1.5"
                        id="hero-explore-btn"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>استكشاف منشورات القاعات</span>
                      </button>
                    </div>
                  </div>

                  {/* Decorative Graphic Element */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                </div>

                {/* Quick City Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500 shrink-0 ml-1">اختر المحافظة:</span>
                  {CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        selectedCity === city
                          ? 'bg-emerald-800 text-white shadow-xs scale-102'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
                      }`}
                      id={`home-city-pill-${city}`}
                    >
                      {city}
                    </button>
                  ))}
                </div>

                {/* Section 1: Halls Showcase */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-800" />
                        قاعات المناسبات والأعراس
                      </h2>
                      <p className="text-xs text-gray-500">القاعات المتاحة للحجز في {selectedCity}</p>
                    </div>

                    <button
                      onClick={() => setCurrentTab('search')}
                      className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      عرض الكل ({displayedHalls.length}) <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedHalls.map((hall) => (
                      <HallCard
                        key={hall.id}
                        hall={hall}
                        isFavorite={favoriteIds.includes(hall.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectHall={setSelectedHallForModal}
                        onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
                      />
                    ))}
                  </div>
                </section>

                {/* Section 2: Explore Posts Carousel Highlight */}
                <section className="space-y-4 bg-emerald-900/5 p-6 rounded-3xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-emerald-950 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                        عروض وكواليس التجهيزات الحية
                      </h2>
                      <p className="text-xs text-gray-600">أحدث الصور والفيديوهات مباشرة من أصحاب القاعات والاستوديوهات</p>
                    </div>

                    <button
                      onClick={() => setCurrentTab('explore')}
                      className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      الانتقال لـ Explore <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {posts.slice(0, 2).map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        isLiked={likedPostIds.includes(post.id)}
                        onToggleLike={handleTogglePostLike}
                        onOpenTarget={(p) => {
                          if (p.targetType === 'hall') {
                            const h = halls.find((x) => x.id === p.targetId);
                            if (h) setSelectedHallForModal(h);
                          } else {
                            const sp = serviceProviders.find((x) => x.id === p.targetId);
                            if (sp) setSelectedProviderForModal(sp);
                          }
                        }}
                        onBookTarget={(p) => {
                          if (p.targetType === 'hall') {
                            const h = halls.find((x) => x.id === p.targetId);
                            if (h) setBookingItemForModal({ type: 'hall', data: h });
                          } else {
                            const sp = serviceProviders.find((x) => x.id === p.targetId);
                            if (sp) setBookingItemForModal({ type: 'provider', data: sp });
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>

                {/* Section 3: Service Providers Showcase */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-amber-600" />
                        مزودو خدمات الزفاف (مصورين، كوشات، صالونات، سيارات)
                      </h2>
                      <p className="text-xs text-gray-500">نخبة الكوادر الاحترافية لليلة زفاف مميزة</p>
                    </div>

                    <button
                      onClick={() => setCurrentTab('search')}
                      className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      عرض الكل ({displayedProviders.length}) <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedProviders.map((provider) => (
                      <ServiceProviderCard
                        key={provider.id}
                        provider={provider}
                        isFavorite={favoriteIds.includes(provider.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelectProvider={setSelectedProviderForModal}
                        onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
                      />
                    ))}
                  </div>
                </section>

              </div>
            )}
          </>
        )}

        {currentTab === 'explore' && (
          <ExploreView
            posts={posts}
            halls={halls}
            serviceProviders={serviceProviders}
            likedPostIds={likedPostIds}
            favoriteIds={favoriteIds}
            onTogglePostLike={handleTogglePostLike}
            onToggleFavorite={handleToggleFavorite}
            onSelectHall={setSelectedHallForModal}
            onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
            onSelectProvider={setSelectedProviderForModal}
            onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            cities={CITIES}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'search' && (
          <SearchView
            halls={halls}
            serviceProviders={serviceProviders}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectHall={setSelectedHallForModal}
            onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
            onSelectProvider={setSelectedProviderForModal}
            onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            cities={CITIES}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'bookings' && (
          <BookingsView
            bookings={userBookings}
            onSelectBooking={setSelectedBookingForDetails}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === 'favorites' && (
          <FavoritesView
            favoriteIds={favoriteIds}
            halls={halls}
            serviceProviders={serviceProviders}
            onToggleFavorite={handleToggleFavorite}
            onSelectHall={setSelectedHallForModal}
            onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
            onSelectProvider={setSelectedProviderForModal}
            onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === 'complaints' && (
          <ComplaintsView
            complaints={complaints}
            currentUser={currentUser}
            onSubmitComplaint={handleCreateComplaint}
            isAdmin={currentUser.accountType === 'مدير Admin'}
            onUpdateComplaintStatus={handleUpdateComplaintStatus}
          />
        )}

        {currentTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAsRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
            onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            onOpenNotificationTarget={handleOpenNotificationTarget}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onUpdateProfile={(updated) => setCurrentUser((prev) => ({ ...prev, ...updated }))}
            onSelectTab={setCurrentTab}
            onOpenPrivacyModal={() => setActiveLegalModal('privacy')}
            onOpenTermsModal={() => setActiveLegalModal('terms')}
            onOpenSupportModal={() => setActiveLegalModal('support')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        favoritesCount={favoriteIds.length}
        bookingsCount={userBookings.length}
      />

      {/* Interactive Modals */}
      <HallDetailsModal
        hall={selectedHallForModal}
        isOpen={!!selectedHallForModal}
        onClose={() => setSelectedHallForModal(null)}
        isFavorite={selectedHallForModal ? favoriteIds.includes(selectedHallForModal.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
        currentUser={currentUser}
        bookings={bookings}
      />

      <ServiceProviderDetailsModal
        provider={selectedProviderForModal}
        isOpen={!!selectedProviderForModal}
        onClose={() => setSelectedProviderForModal(null)}
        isFavorite={selectedProviderForModal ? favoriteIds.includes(selectedProviderForModal.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
        currentUser={currentUser}
        bookings={bookings}
      />

      <BookingModal
        item={bookingItemForModal}
        isOpen={!!bookingItemForModal}
        onClose={() => setBookingItemForModal(null)}
        currentUser={currentUser}
        bookings={bookings}
        onLoginSuccess={handleLoginSuccess}
        onSubmitBooking={handleCreateBooking}
      />

      <BookingDetailsModal
        booking={selectedBookingForDetails}
        isOpen={!!selectedBookingForDetails}
        onClose={() => setSelectedBookingForDetails(null)}
        onCancelBooking={handleCancelBooking}
      />

      <LegalSupportModals
        activeModal={activeLegalModal}
        onClose={() => setActiveLegalModal(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

    </div>
  );
}

export default App;
