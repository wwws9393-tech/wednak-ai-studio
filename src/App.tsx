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
import { ErrorBoundary } from './components/ErrorBoundary';

import { Hall, ServiceProvider, FeedPost, Booking, Complaint, AppNotification, UserProfile, AccountType, BookingStatus } from './types';
import { GUEST_ANONYMOUS_USER } from './data/usersDatabase';
import {
  auth,
  ensureFirebaseAuth,
  fetchUserFromFirestore,
  saveUserToFirestore,
  subscribeBookings,
  createBookingInFirestore,
  updateBookingStatusInFirestore,
  cancelBookingInFirestore,
  subscribeUserFavorites,
  toggleUserFavoriteInFirestore,
  subscribeComplaints,
  createComplaintInFirestore,
  seedInitialDataIfEmpty,
  subscribeHalls,
  subscribeServiceProviders,
  subscribePosts,
  createPostInFirestore,
} from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Building2, Camera, Sparkles, MapPin, ArrowLeft, Heart, Search, Calendar, ShieldAlert } from 'lucide-react';

const CITIES = ['جميع المحافظات', 'بغداد', 'أربيل', 'البصرة', 'النجف', 'كربلاء', 'الموصل', 'السليمانية'];

export function App() {
  // 1. Core Real-Time Firestore State
  const [halls, setHalls] = useState<Hall[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const [selectedCity, setSelectedCity] = useState<string>('جميع المحافظات');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_ANONYMOUS_USER);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Seed Firestore data if empty and set up listeners
  useEffect(() => {
    seedInitialDataIfEmpty();

    const unsubHalls = subscribeHalls(setHalls);
    const unsubProviders = subscribeServiceProviders(setServiceProviders);
    const unsubPosts = subscribePosts(setPosts);

    return () => {
      unsubHalls();
      unsubProviders();
      unsubPosts();
    };
  }, []);

  // Auth & User Profile Synchronization
  useEffect(() => {
    let unsubBookings: () => void = () => {};
    let unsubFavs: () => void = () => {};
    let unsubComplaints: () => void = () => {};

    ensureFirebaseAuth().then(() => {
      setIsLoadingAuth(false);
    });

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous listeners
      unsubBookings();
      unsubFavs();
      unsubComplaints();

      if (firebaseUser) {
        // Fetch user profile doc from Firestore
        const userDoc = await fetchUserFromFirestore(firebaseUser.uid);
        if (userDoc) {
          setCurrentUser(userDoc);
          
          let chosenRoute = 'CustomerHome';
          if (userDoc.accountType === 'صاحب قاعة') chosenRoute = 'OwnerHome';
          else if (userDoc.accountType === 'مزود خدمة') chosenRoute = 'ServiceProviderHome';
          else if (userDoc.accountType === 'مدير Admin' || userDoc.accountType === 'مدير') chosenRoute = 'AdminHome';

          console.log(`[AuthGate Debug] uid الحالي: ${firebaseUser.uid}`);
          console.log(`[AuthGate Debug] accountType المقروء من Firestore: "${userDoc.accountType}"`);
          console.log(`[AuthGate Debug] route الذي تم اختياره: "${chosenRoute}"`);

          // Subscribe to real-time collections for this UID
          unsubBookings = subscribeBookings(firebaseUser.uid, userDoc.accountType, setBookings);
          unsubFavs = subscribeUserFavorites(firebaseUser.uid, setFavoriteIds);
          unsubComplaints = subscribeComplaints(firebaseUser.uid, userDoc.accountType, setComplaints);
        } else {
          setCurrentUser({
            ...GUEST_ANONYMOUS_USER,
            id: firebaseUser.uid,
          });
          unsubBookings = subscribeBookings(firebaseUser.uid, 'زبون', setBookings);
          unsubFavs = subscribeUserFavorites(firebaseUser.uid, setFavoriteIds);
          unsubComplaints = subscribeComplaints(firebaseUser.uid, 'زبون', setComplaints);
        }
      } else {
        setCurrentUser(GUEST_ANONYMOUS_USER);
        setBookings([]);
        setFavoriteIds([]);
        setComplaints([]);
      }
    });

    return () => {
      unsubAuth();
      unsubBookings();
      unsubFavs();
      unsubComplaints();
    };
  }, []);

  // Modals Active State
  const [selectedHallForModal, setSelectedHallForModal] = useState<Hall | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<ServiceProvider | null>(null);
  const [bookingItemForModal, setBookingItemForModal] = useState<{ type: 'hall'; data: Hall } | { type: 'provider'; data: ServiceProvider } | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'support' | null>(null);

  // Handlers
  const handleToggleFavorite = async (id: string, type: 'hall' | 'provider' | 'post' = 'hall') => {
    if (currentUser.isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    await toggleUserFavoriteInFirestore(currentUser.id, id, type);
  };

  const handleTogglePostLike = (postId: string) => {
    setLikedPostIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleChangeAccountType = async (newType: AccountType) => {
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

  const handleLoginSuccess = async (userDoc: UserProfile) => {
    setCurrentUser(userDoc);
    setCurrentTab('home');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await ensureFirebaseAuth();
      setCurrentUser(GUEST_ANONYMOUS_USER);
      setBookings([]);
      setFavoriteIds([]);
      setComplaints([]);
      setIsAuthModalOpen(true);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleCreateBooking = async (bookingData: {
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
    customerId: string;
    ownerId?: string;
  }) => {
    await createBookingInFirestore(bookingData);
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBookingStatusInFirestore(bookingId, newStatus);
  };

  const handleCancelBooking = async (bookingId: string) => {
    await cancelBookingInFirestore(bookingId);
  };

  const handleCreateComplaint = async (data: { subject: string; relatedItemName?: string; description: string }) => {
    await createComplaintInFirestore({
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      subject: data.subject,
      relatedItemName: data.relatedItemName,
      description: data.description,
    });
  };

  const handleCreatePost = async (postData: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => {
    await createPostInFirestore(postData);
  };

  // Filtered Items by City
  const filteredHalls = halls.filter(
    (h) => selectedCity === 'جميع المحافظات' || h.city === selectedCity
  );

  const filteredProviders = serviceProviders.filter(
    (p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity
  );

  const filteredPosts = posts.filter(
    (p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity
  );

  // Favorite Halls and Service Providers
  const favoriteHalls = halls.filter((h) => favoriteIds.includes(h.id));
  const favoriteProviders = serviceProviders.filter((p) => favoriteIds.includes(p.id));

  // Render Logic based on Role and Tab
  const renderRoleSpecificView = () => {
    if (currentUser.accountType === 'صاحب قاعة') {
      return (
        <OwnerHomeView
          currentUser={currentUser}
          halls={halls}
          bookings={bookings}
          onUpdateHall={() => {}}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onCreatePost={handleCreatePost}
        />
      );
    }

    if (currentUser.accountType === 'مزود خدمة') {
      return (
        <ServiceProviderHomeView
          currentUser={currentUser}
          serviceProviders={serviceProviders}
          bookings={bookings}
          onUpdateServiceProvider={() => {}}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onCreatePost={handleCreatePost}
        />
      );
    }

    if (currentUser.accountType === 'مدير Admin' || currentUser.accountType === 'مدير') {
      return (
        <AdminHomeView
          currentUser={currentUser}
          complaints={complaints}
          bookings={bookings}
          onUpdateComplaintStatus={handleUpdateComplaintStatus}
        />
      );
    }

    // Customer / Guest Tab Views
    switch (currentTab) {
      case 'home':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
            {/* Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 sm:p-10 text-white shadow-xl border border-amber-500/20">
              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  منصة ويدنك العراقية لحجز الأعراس
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-amber-100 leading-tight">
                  اختر قاعة أحلامك ومزودي خدمات زفافك في مكان واحد
                </h1>
                <p className="text-xs sm:text-sm text-gray-200">
                  استكشف أفضل قاعات المناسبات، استوديوهات التصوير، وتنسيق الكوشات مع إمكانية الحجز المباشر بالأسعار الرسمية
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setCurrentTab('search')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>البحث والفلترة المتقدمة</span>
                  </button>
                  <button
                    onClick={() => setCurrentTab('explore')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>تصفح عروض الاستكشاف</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Halls Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-800" />
                    قاعات الأعراس والمناسبات
                  </h2>
                  <p className="text-xs text-gray-500">أحدث القاعات المتاحة في {selectedCity}</p>
                </div>
                <button
                  onClick={() => setCurrentTab('search')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center gap-1"
                >
                  <span>عرض الكل ({filteredHalls.length})</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHalls.slice(0, 6).map((hall) => (
                  <HallCard
                    key={hall.id}
                    hall={hall}
                    isFavorite={favoriteIds.includes(hall.id)}
                    onToggleFavorite={() => handleToggleFavorite(hall.id, 'hall')}
                    onSelectHall={setSelectedHallForModal}
                    onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            </div>

            {/* Service Providers Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-800" />
                    مزودو خدمات الزفاف والتصوير
                  </h2>
                  <p className="text-xs text-gray-500">استوديوهات، كوشات، صالونات، وبوفيهات مفتوحة</p>
                </div>
                <button
                  onClick={() => setCurrentTab('search')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center gap-1"
                >
                  <span>عرض الكل ({filteredProviders.length})</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.slice(0, 6).map((provider) => (
                  <ServiceProviderCard
                    key={provider.id}
                    provider={provider}
                    isFavorite={favoriteIds.includes(provider.id)}
                    onToggleFavorite={() => handleToggleFavorite(provider.id, 'provider')}
                    onSelectProvider={setSelectedProviderForModal}
                    onBookProvider={(p) => setBookingItemForModal({ type: 'provider', data: p })}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'search':
        return (
          <SearchView
            halls={halls}
            serviceProviders={serviceProviders}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            cities={CITIES}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectHall={setSelectedHallForModal}
            onBookHall={(h) => setBookingItemForModal({ type: 'hall', data: h })}
            onSelectProvider={setSelectedProviderForModal}
            onBookProvider={(sp) => setBookingItemForModal({ type: 'provider', data: sp })}
            currentUser={currentUser}
          />
        );

      case 'explore':
        return (
          <ExploreView
            posts={filteredPosts}
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
        );

      case 'bookings':
        return (
          <BookingsView
            bookings={bookings}
            onSelectBooking={setSelectedBookingForDetails}
            onSelectTab={setCurrentTab}
          />
        );

      case 'favorites':
        return (
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
        );

      case 'notifications':
        return (
          <NotificationsView
            notifications={notifications}
            onMarkAsRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))}
            onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            onOpenNotificationTarget={(n) => {
              if (n.type === 'booking') setCurrentTab('bookings');
              else if (n.type === 'offer') setCurrentTab('explore');
            }}
          />
        );

      case 'complaints':
        return (
          <ComplaintsView
            complaints={complaints}
            currentUser={currentUser}
            onSubmitComplaint={handleCreateComplaint}
            isAdmin={currentUser.accountType === 'مدير Admin' || currentUser.accountType === 'مدير'}
            onUpdateComplaintStatus={handleUpdateComplaintStatus}
          />
        );

      case 'profile':
        return (
          <ProfileView
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            onSelectTab={setCurrentTab}
            onOpenPrivacyModal={() => setActiveLegalModal('privacy')}
            onOpenTermsModal={() => setActiveLegalModal('terms')}
            onOpenSupportModal={() => setActiveLegalModal('support')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif] dir-rtl pb-24">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1">
        <ErrorBoundary key={currentTab}>
          {renderRoleSpecificView()}
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        accountType={currentUser.accountType}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        bookingsCount={bookings.length}
        favoritesCount={favoriteIds.length}
      />

      {/* Modals */}
      <HallDetailsModal
        hall={selectedHallForModal}
        isOpen={!!selectedHallForModal}
        onClose={() => setSelectedHallForModal(null)}
        isFavorite={selectedHallForModal ? favoriteIds.includes(selectedHallForModal.id) : false}
        onToggleFavorite={() => selectedHallForModal && handleToggleFavorite(selectedHallForModal.id, 'hall')}
        onOpenBookingModal={(hall) => {
          setSelectedHallForModal(null);
          setBookingItemForModal({ type: 'hall', data: hall });
        }}
      />

      <ServiceProviderDetailsModal
        provider={selectedProviderForModal}
        isOpen={!!selectedProviderForModal}
        onClose={() => setSelectedProviderForModal(null)}
        isFavorite={selectedProviderForModal ? favoriteIds.includes(selectedProviderForModal.id) : false}
        onToggleFavorite={() => selectedProviderForModal && handleToggleFavorite(selectedProviderForModal.id, 'provider')}
        onOpenBookingModal={(provider) => {
          setSelectedProviderForModal(null);
          setBookingItemForModal({ type: 'provider', data: provider });
        }}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <LegalSupportModals
        activeModal={activeLegalModal}
        onClose={() => setActiveLegalModal(null)}
      />
    </div>
  );
}

export default App;
