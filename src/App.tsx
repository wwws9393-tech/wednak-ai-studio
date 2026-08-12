import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HallCard } from './components/HallCard';
import { ServiceProviderCard } from './components/ServiceProviderCard';
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
import { UserProfileModal } from './components/UserProfileModal';

import { Hall, ServiceProvider, FeedPost, Booking, Complaint, AppNotification, UserProfile, BookingStatus } from './types';
import { GUEST_ANONYMOUS_USER } from './data/usersDatabase';
import { TEMP_DEMO_HALLS, TEMP_DEMO_PROVIDERS } from './data/tempDemoData';
import {
  auth,
  ensureFirebaseAuth,
  fetchUserFromFirestore,
  saveUserToFirestore,
  subscribeBookings,
  createBookingInFirestore,
  updateBookingStatusInFirestore,
  subscribeUserFavorites,
  toggleUserFavoriteInFirestore,
  subscribeComplaints,
  createComplaintInFirestore,
  updateComplaintStatusInFirestore,
  seedInitialDataIfEmpty,
  subscribeHalls,
  subscribeServiceProviders,
  subscribePosts,
  createPostInFirestore,
  deletePostInFirestore,
  subscribeAllUsers,
  setUserBlockedInFirestore,
  fetchPublicUserProfile,
  subscribeUserProfile,
} from './lib/firebase';
import { cancelBookingWithActorInFirestore } from './lib/bookingCancellation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Building2, Camera, Sparkles, ArrowLeft, Search } from 'lucide-react';

const CITIES = ['جميع المحافظات', 'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'الديوانية', 'بابل', 'واسط', 'ذي قار', 'ميسان', 'المثنى', 'الأنبار', 'صلاح الدين', 'ديالى', 'كركوك', 'دهوك', 'السليمانية', 'حلبجة'];

function notificationStorageKey(uid: string) { return `wednak-read-notifications-${uid}`; }

export function App() {
  const [halls, setHalls] = useState<Hall[]>(TEMP_DEMO_HALLS);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>(TEMP_DEMO_PROVIDERS);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('جميع المحافظات');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_ANONYMOUS_USER);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile|null>(null);
  const [adminDataErrors,setAdminDataErrors]=useState<string[]>([]);

  useEffect(() => {
    seedInitialDataIfEmpty();
    const unsubHalls = subscribeHalls((liveHalls) => setHalls([...TEMP_DEMO_HALLS, ...liveHalls]));
    const unsubProviders = subscribeServiceProviders((liveProviders) => setServiceProviders([...TEMP_DEMO_PROVIDERS, ...liveProviders]));
    const unsubPosts = subscribePosts(setPosts);
    return () => { unsubHalls(); unsubProviders(); unsubPosts(); };
  }, []);

  useEffect(()=>{
    if(currentUser.accountType!=='مدير'&&currentUser.accountType!=='مدير Admin'){setAllUsers([]);return;}
    return subscribeAllUsers((items)=>{setAllUsers(items);setAdminDataErrors(prev=>prev.filter(x=>!x.startsWith('users:')))},(message)=>setAdminDataErrors(prev=>Array.from(new Set([...prev,`users:${message}`]))));
  },[currentUser.id,currentUser.accountType]);
  useEffect(()=>{if(!currentUser.id||currentUser.isGuest)return;return subscribeUserProfile(currentUser.id,setCurrentUser)},[currentUser.id,currentUser.isGuest]);

  useEffect(() => {
    let unsubBookings: () => void = () => {};
    let unsubFavs: () => void = () => {};
    let unsubComplaints: () => void = () => {};
    ensureFirebaseAuth().then(() => setIsLoadingAuth(false));
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubBookings(); unsubFavs(); unsubComplaints();
      if (firebaseUser) {
        const userDoc = await fetchUserFromFirestore(firebaseUser.uid);
        if (userDoc) {
          setCurrentUser(userDoc);
          unsubBookings = subscribeBookings(firebaseUser.uid, userDoc.accountType, (items)=>{setBookings(items);setAdminDataErrors(prev=>prev.filter(x=>!x.startsWith('bookings:')))},(message)=>setAdminDataErrors(prev=>Array.from(new Set([...prev,`bookings:${message}`]))));
          unsubFavs = subscribeUserFavorites(firebaseUser.uid, setFavoriteIds);
          unsubComplaints = subscribeComplaints(firebaseUser.uid, userDoc.accountType, setComplaints);
        } else {
          setCurrentUser({ ...GUEST_ANONYMOUS_USER, id: firebaseUser.uid });
          unsubBookings = subscribeBookings(firebaseUser.uid, 'زبون', setBookings);
          unsubFavs = subscribeUserFavorites(firebaseUser.uid, setFavoriteIds);
          unsubComplaints = subscribeComplaints(firebaseUser.uid, 'زبون', setComplaints);
        }
      } else {
        setCurrentUser(GUEST_ANONYMOUS_USER); setBookings([]); setFavoriteIds([]); setComplaints([]); setNotifications([]);
      }
    });
    return () => { unsubAuth(); unsubBookings(); unsubFavs(); unsubComplaints(); };
  }, []);

  useEffect(() => {
    if (currentUser.isGuest || !currentUser.id) { setNotifications([]); return; }
    let readIds: string[] = [];
    try { readIds = JSON.parse(localStorage.getItem(notificationStorageKey(currentUser.id)) || '[]'); } catch { readIds = []; }

    const bookingNotifications: AppNotification[] = bookings.slice(0, 40).map((booking) => {
      const incoming = booking.targetOwnerId === currentUser.id;
      const pending = booking.status === 'قيد المراجعة' || booking.status === 'pending';
      const accepted = booking.status === 'مقبول' || booking.status === 'accepted';
      const rejected = booking.status === 'مرفوض' || booking.status === 'rejected';
      const cancelled = booking.status === 'ملغي' || booking.status === 'cancelled';
      let title = '';
      let subtitle = '';

      if (incoming) {
        if (pending) {
          title = `طلب حجز جديد من ${booking.requesterName || booking.customerName}`;
          subtitle = `${booking.itemName} • ${booking.date} • ${booking.startTime || booking.timeSlot} — اضغط لفتح الطلب وقبوله أو رفضه`;
        } else if (cancelled) {
          title = 'تم إلغاء حجز';
          subtitle = `${booking.itemName} • ألغاه ${booking.cancelledByRole || 'أحد أطراف الحجز'}${booking.cancelledByName ? ` (${booking.cancelledByName})` : ''}`;
        } else {
          title = `تم تحديث الطلب إلى ${accepted ? 'مقبول' : rejected ? 'مرفوض' : booking.status}`;
          subtitle = `${booking.itemName} • ${booking.date}`;
        }
      } else {
        if (pending) {
          title = `تم إرسال طلب الحجز إلى ${booking.itemName}`;
          subtitle = `${booking.date} • ${booking.startTime || booking.timeSlot} — بانتظار رد صاحب الخدمة`;
        } else if (accepted) {
          title = `تم قبول حجزك لدى ${booking.itemName}`;
          subtitle = `${booking.date} • ${booking.startTime || booking.timeSlot} — الموعد مثبت الآن`;
        } else if (rejected) {
          title = `تم رفض طلب حجزك لدى ${booking.itemName}`;
          subtitle = `${booking.date} • يمكنك اختيار موعد أو خدمة أخرى`;
        } else if (cancelled) {
          title = `تم إلغاء الحجز لدى ${booking.itemName}`;
          subtitle = `تم الإلغاء بواسطة ${booking.cancelledByRole || 'أحد أطراف الحجز'}${booking.cancelledByName ? ` (${booking.cancelledByName})` : ''}`;
        } else {
          title = `تحديث حجزك لدى ${booking.itemName}`;
          subtitle = `${booking.date} • ${booking.status}`;
        }
      }

      const id = `booking-${booking.id}-${booking.status}-${booking.updatedAt || booking.createdAt}`;
      return { id, title, subtitle, date: booking.updatedAt || booking.createdAt, type: 'booking', targetBookingId: booking.id, read: readIds.includes(id) };
    });
    setNotifications(bookingNotifications);
  }, [bookings, currentUser.id, currentUser.isGuest]);

  const persistReadIds = (items: AppNotification[]) => {
    if (!currentUser.id || currentUser.isGuest) return;
    localStorage.setItem(notificationStorageKey(currentUser.id), JSON.stringify(items.filter((n) => n.read).map((n) => n.id).slice(0, 200)));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      persistReadIds(next);
      return next;
    });
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persistReadIds(next);
      return next;
    });
  };

  const [selectedHallForModal, setSelectedHallForModal] = useState<Hall | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<ServiceProvider | null>(null);
  const [bookingItemForModal, setBookingItemForModal] = useState<{ type: 'hall'; data: Hall } | { type: 'provider'; data: ServiceProvider } | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | 'support' | null>(null);

  const handleToggleFavorite = async (id: string, type: 'hall' | 'provider' | 'post' = 'hall') => {
    if (currentUser.isGuest) { setIsAuthModalOpen(true); return; }
    await toggleUserFavoriteInFirestore(currentUser.id, id, type);
  };
  const handleTogglePostLike = (postId: string) => setLikedPostIds((prev) => prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]);
  const handleLoginSuccess = async (userDoc: UserProfile) => { setCurrentUser(userDoc); setCurrentTab('home'); };
  const handleLogout = async () => {
    try {
      await signOut(auth); await ensureFirebaseAuth(); setCurrentUser(GUEST_ANONYMOUS_USER); setBookings([]); setFavoriteIds([]); setComplaints([]); setNotifications([]); setIsAuthModalOpen(true);
    } catch (err) { console.error('Error signing out:', err); }
  };

  const handleCreateBooking = async (bookingData: {
    itemType: 'hall' | 'provider'; itemId: string; itemName: string; itemLocation: string; itemImage: string;
    date: string; timeSlot: string; guests?: number; totalPrice: number; depositAmount: number; notes: string;
    customerName: string; customerPhone: string; customerId: string; ownerId?: string;
  }) => { await createBookingInFirestore(bookingData); };
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => { await updateBookingStatusInFirestore(bookingId, newStatus); };
  const handleCancelBooking = async (bookingId: string) => { await cancelBookingWithActorInFirestore(bookingId, currentUser); };
  const handleCreateComplaint = async (data: { subject: string; relatedItemName?: string; description: string }) => {
    await createComplaintInFirestore({ userId: currentUser.id, userName: currentUser.name, userPhone: currentUser.phone, subject: data.subject, relatedItemName: data.relatedItemName, description: data.description });
  };
  const handleUpdateComplaintStatus = async (complaintId: string, status: Complaint['status'], adminReply?: string) => { await updateComplaintStatusInFirestore(complaintId, status, adminReply); };
  const handleUpdateProfile = async (updatedFields: Partial<UserProfile>) => { const updatedUser = { ...currentUser, ...updatedFields }; setCurrentUser(updatedUser); await saveUserToFirestore(updatedUser); };
  const handleCreatePost = async (postData: Omit<FeedPost, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>) => { await createPostInFirestore(postData); };
  const handleDeletePost = async (postId: string) => { await deletePostInFirestore(postId); };

  const filteredHalls = halls.filter((h) => selectedCity === 'جميع المحافظات' || h.city === selectedCity);
  const filteredProviders = serviceProviders.filter((p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity);
  const filteredPosts = posts.filter((p) => selectedCity === 'جميع المحافظات' || p.city === selectedCity);
  const bookingsWithCurrentImages=bookings.map(b=>{if(b.itemType==='provider'){const p=serviceProviders.find(x=>x.id===b.itemId);return p?{...b,itemImage:p.avatar||p.coverImage||b.itemImage}:b;}const h=halls.find(x=>x.id===b.itemId);return h?{...b,itemImage:h.profileImageUrl||h.coverImage||h.images?.[0]||b.itemImage}:b;});

  const renderRoleSpecificView = () => {
    if (currentUser.accountType === 'صاحب قاعة' && currentTab === 'home') {
      return <OwnerHomeView currentUser={currentUser} halls={halls} bookings={bookings} posts={posts} onUpdateHall={() => {}} onUpdateBookingStatus={handleUpdateBookingStatus} onCreatePost={handleCreatePost} onDeletePost={handleDeletePost} />;
    }
    if (currentUser.accountType === 'مزود خدمة' && currentTab === 'home') {
      return <ServiceProviderHomeView currentUser={currentUser} serviceProviders={serviceProviders} bookings={bookings} posts={posts} onUpdateServiceProvider={() => {}} onUpdateBookingStatus={handleUpdateBookingStatus} onCreatePost={handleCreatePost} onDeletePost={handleDeletePost} />;
    }
    if (currentUser.accountType === 'مدير Admin' || currentUser.accountType === 'مدير') {
      return <AdminHomeView currentUser={currentUser} users={allUsers} dataErrors={adminDataErrors} complaints={complaints} bookings={bookings} halls={halls} providers={serviceProviders} onOpenUser={setSelectedUserProfile} onOpenUserId={async(id)=>{const user=await fetchPublicUserProfile(id);if(user)setSelectedUserProfile(user)}} onOpenHall={setSelectedHallForModal} onOpenProvider={setSelectedProviderForModal} onUpdateComplaintStatus={handleUpdateComplaintStatus} onUpdateBookingStatus={handleUpdateBookingStatus} />;
    }

    switch (currentTab) {
      case 'home':
        return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 p-6 sm:p-10 text-white shadow-xl border border-amber-500/20"><div className="relative z-10 max-w-2xl space-y-3"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30"><Sparkles className="w-3.5 h-3.5"/>منصة ويدنك العراقية لحجز الأعراس</span><h1 className="text-2xl sm:text-4xl font-black text-amber-100 leading-tight">اختر قاعة أحلامك ومزودي خدمات زفافك في مكان واحد</h1><p className="text-xs sm:text-sm text-gray-200">استكشف أفضل قاعات المناسبات ومزودي خدمات الزفاف مع الحجز المباشر.</p><div className="pt-2 flex flex-wrap gap-3"><button onClick={()=>setCurrentTab('search')} className="px-5 py-2.5 bg-amber-500 text-black font-extrabold text-xs rounded-2xl flex items-center gap-2"><Search className="w-4 h-4"/>البحث الشامل</button><button onClick={()=>setCurrentTab('explore')} className="px-5 py-2.5 bg-white/10 text-white font-bold text-xs rounded-2xl border border-white/20 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-300"/>الاستكشاف</button></div></div></div>
          <div className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-800"/>قاعات الأعراس والمناسبات</h2><p className="text-xs text-gray-500">أحدث القاعات المتاحة في {selectedCity}</p></div><button onClick={()=>setCurrentTab('search')} className="text-xs font-bold text-emerald-800 underline flex items-center gap-1">عرض الكل ({filteredHalls.length})<ArrowLeft className="w-3.5 h-3.5"/></button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredHalls.slice(0,6).map((hall)=><HallCard key={hall.id} hall={hall} isFavorite={favoriteIds.includes(hall.id)} onToggleFavorite={()=>handleToggleFavorite(hall.id,'hall')} onSelectHall={setSelectedHallForModal} onBookHall={(h)=>setBookingItemForModal({type:'hall',data:h})} currentUser={currentUser}/>)}</div></div>
          <div className="space-y-4 pt-4 border-t border-gray-200"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Camera className="w-5 h-5 text-emerald-800"/>مزودو خدمات الزفاف والتصوير</h2></div><button onClick={()=>setCurrentTab('search')} className="text-xs font-bold text-emerald-800 underline flex items-center gap-1">عرض الكل ({filteredProviders.length})<ArrowLeft className="w-3.5 h-3.5"/></button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredProviders.slice(0,6).map((provider)=><ServiceProviderCard key={provider.id} provider={provider} isFavorite={favoriteIds.includes(provider.id)} onToggleFavorite={()=>handleToggleFavorite(provider.id,'provider')} onSelectProvider={setSelectedProviderForModal} onBookProvider={(p)=>setBookingItemForModal({type:'provider',data:p})} currentUser={currentUser}/>)}</div></div>
        </div>;
      case 'search': return <SearchView halls={halls} serviceProviders={serviceProviders} selectedCity={selectedCity} onSelectCity={setSelectedCity} cities={CITIES} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} onSelectHall={setSelectedHallForModal} onBookHall={(h)=>setBookingItemForModal({type:'hall',data:h})} onSelectProvider={setSelectedProviderForModal} onBookProvider={(sp)=>setBookingItemForModal({type:'provider',data:sp})} currentUser={currentUser}/>;
      case 'explore': return <ExploreView posts={filteredPosts} halls={halls} serviceProviders={serviceProviders} likedPostIds={likedPostIds} favoriteIds={favoriteIds} onTogglePostLike={handleTogglePostLike} onToggleFavorite={handleToggleFavorite} onSelectHall={setSelectedHallForModal} onBookHall={(h)=>setBookingItemForModal({type:'hall',data:h})} onSelectProvider={setSelectedProviderForModal} onBookProvider={(sp)=>setBookingItemForModal({type:'provider',data:sp})} selectedCity={selectedCity} onSelectCity={setSelectedCity} cities={CITIES} currentUser={currentUser}/>;
      case 'bookings': return <BookingsView bookings={bookingsWithCurrentImages} onSelectBooking={setSelectedBookingForDetails} onSelectTab={setCurrentTab}/>;
      case 'favorites': return <FavoritesView favoriteIds={favoriteIds} halls={halls} serviceProviders={serviceProviders} onToggleFavorite={handleToggleFavorite} onSelectHall={setSelectedHallForModal} onBookHall={(h)=>setBookingItemForModal({type:'hall',data:h})} onSelectProvider={setSelectedProviderForModal} onBookProvider={(sp)=>setBookingItemForModal({type:'provider',data:sp})} onSelectTab={setCurrentTab}/>;
      case 'notifications': return <NotificationsView notifications={notifications} onMarkAsRead={markNotificationRead} onMarkAllAsRead={markAllNotificationsRead} onOpenNotificationTarget={(n)=>{ if(n.targetBookingId){ const booking=bookings.find((b)=>b.id===n.targetBookingId); if(booking){setSelectedBookingForDetails(booking); return;} } if(n.type==='booking') setCurrentTab('bookings'); else if(n.type==='offer') setCurrentTab('explore'); }}/>;
      case 'complaints': return <ComplaintsView complaints={complaints} currentUser={currentUser} onSubmitComplaint={handleCreateComplaint} isAdmin={false} onUpdateComplaintStatus={handleUpdateComplaintStatus}/>;
      case 'profile': return <ProfileView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onSelectTab={setCurrentTab} onOpenPrivacyModal={()=>setActiveLegalModal('privacy')} onOpenTermsModal={()=>setActiveLegalModal('terms')} onOpenSupportModal={()=>setActiveLegalModal('support')} onOpenAuthModal={()=>setIsAuthModalOpen(true)}/>;
      default: return null;
    }
  };

  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center text-emerald-800 font-bold">جاري تحميل ويدنك...</div>;
  if (currentUser.isBlocked) return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl"><div className="max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl"><h1 className="text-2xl font-black text-rose-700">حسابك موقوف</h1><p className="text-sm text-gray-600 mt-3">تم منع هذا الحساب من استخدام ويدنك. السبب: {currentUser.blockReason||'مخالفة شروط الاستخدام'}.</p><button onClick={handleLogout} className="mt-5 px-5 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold">تسجيل الخروج</button></div></div>;

  return <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif] dir-rtl pb-24">
    <Header currentTab={currentTab} onSelectTab={setCurrentTab} selectedCity={selectedCity} onSelectCity={setSelectedCity} cities={CITIES} favoritesCount={favoriteIds.length} unreadNotificationsCount={notifications.filter((n)=>!n.read).length} currentAccountType={currentUser.accountType} onOpenAuthModal={()=>setIsAuthModalOpen(true)}/>
    <main className="flex-1"><ErrorBoundary key={currentTab}>{renderRoleSpecificView()}</ErrorBoundary></main>
    <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} accountType={currentUser.accountType} unreadNotificationsCount={notifications.filter((n)=>!n.read).length} bookingsCount={bookings.length} favoritesCount={favoriteIds.length}/>

    <HallDetailsModal hall={selectedHallForModal} isOpen={!!selectedHallForModal} onClose={()=>setSelectedHallForModal(null)} isFavorite={selectedHallForModal?favoriteIds.includes(selectedHallForModal.id):false} onToggleFavorite={()=>selectedHallForModal&&handleToggleFavorite(selectedHallForModal.id,'hall')} currentUser={currentUser} bookings={bookings} posts={posts.filter((p)=>selectedHallForModal&&p.targetType==='hall'&&p.targetId===selectedHallForModal.id)} onBookHall={(hall)=>{setSelectedHallForModal(null);setBookingItemForModal({type:'hall',data:hall});}}/>
    <ServiceProviderDetailsModal provider={selectedProviderForModal} isOpen={!!selectedProviderForModal} onClose={()=>setSelectedProviderForModal(null)} isFavorite={selectedProviderForModal?favoriteIds.includes(selectedProviderForModal.id):false} onToggleFavorite={()=>selectedProviderForModal&&handleToggleFavorite(selectedProviderForModal.id,'provider')} currentUser={currentUser} bookings={bookings} posts={posts.filter((p)=>selectedProviderForModal&&p.targetType==='provider'&&p.targetId===selectedProviderForModal.id)} onBookProvider={(provider)=>{setSelectedProviderForModal(null);setBookingItemForModal({type:'provider',data:provider});}}/>
    <BookingModal item={bookingItemForModal} isOpen={!!bookingItemForModal} onClose={()=>setBookingItemForModal(null)} currentUser={currentUser} bookings={bookings} onLoginSuccess={handleLoginSuccess} onSubmitBooking={handleCreateBooking}/>
    <BookingDetailsModal booking={selectedBookingForDetails} isOpen={!!selectedBookingForDetails} onClose={()=>setSelectedBookingForDetails(null)} onCancelBooking={handleCancelBooking} currentUser={currentUser} onUpdateStatus={handleUpdateBookingStatus} onOpenRequester={async(id)=>{const u=await fetchPublicUserProfile(id);if(u){setSelectedBookingForDetails(null);setSelectedUserProfile(u);}}}/>
    <AuthModal isOpen={isAuthModalOpen} onClose={()=>setIsAuthModalOpen(false)} currentUser={currentUser} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout}/>
    <LegalSupportModals activeModal={activeLegalModal} onClose={()=>setActiveLegalModal(null)}/>
    <UserProfileModal user={selectedUserProfile} bookings={bookings} isAdmin={currentUser.accountType==='مدير'||currentUser.accountType==='مدير Admin'} onClose={()=>setSelectedUserProfile(null)} onBlock={async(u,blocked)=>{await setUserBlockedInFirestore(u.id,blocked,currentUser);setSelectedUserProfile({...u,isBlocked:blocked});}} onOpenBusiness={(u)=>{setSelectedUserProfile(null);if(u.accountType==='صاحب قاعة'){const h=halls.find(x=>x.ownerId===u.id);if(h)setSelectedHallForModal(h);}else if(u.accountType==='مزود خدمة'){const p=serviceProviders.find(x=>x.ownerId===u.id);if(p)setSelectedProviderForModal(p);}}}/>
  </div>;
}

export default App;
