export type AccountType = 'زبون' | 'صاحب قاعة' | 'مزود خدمة' | 'مدير Admin' | 'مدير';

export interface Hall {
  id: string;
  ownerId?: string;
  name: string;
  location: string;
  city: string;
  price: number;
  priceFormatted: string;
  capacity: number;
  rating: number;
  reviewsCount: number;
  images: string[];
  coverImage?: string;
  profileImageUrl?: string;
  phone?: string;
  description: string;
  deposit: number;
  depositFormatted: string;
  features: string[];
  category: 'قاعات فخمة' | 'قاعات متوسطة' | 'حدائق ومناطق مفتوحة' | 'قاعات فنادق';
  isFeatured?: boolean;
}

export type ServiceCategory = 'تصوير وفيديو' | 'تزيين وكوشة' | 'فرقة وسنترال' | 'سيارات زفاف' | 'صالون ومكياج عرائس' | 'ضيافة وبوفيه';

export interface ServiceProvider {
  id: string;
  ownerId?: string;
  name: string;
  serviceCategory: ServiceCategory;
  city: string;
  location: string;
  rating: number;
  reviewsCount: number;
  priceStart: number;
  priceStartFormatted: string;
  avatar: string;
  coverImage: string;
  portfolio: string[];
  description: string;
  phone: string;
  isVerified?: boolean;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: 'صاحب قاعة' | 'مزود خدمة';
  targetType: 'hall' | 'provider';
  targetId: string;
  title: string;
  caption: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  likesCount: number;
  sharesCount: number;
  createdAt: string;
  city: string;
}

export type BookingStatus = 'قيد المراجعة' | 'مقبول' | 'مرفوض' | 'ملغي' | 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  bookingId?: string;
  itemType: 'hall' | 'provider';
  itemId: string;
  itemName: string;
  itemLocation: string;
  itemImage: string;
  date: string;
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  period?: string;
  guests?: number;
  totalPrice: number;
  depositAmount: number;
  notes: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  customerPhone: string;
  customerId: string;
  requesterId?: string;
  requesterName?: string;
  requesterPhone?: string;
  requesterAccountType?: string;
  ownerId?: string;
  targetOwnerId?: string;
  targetType?: 'hall' | 'provider';
  hallId?: string | null;
  serviceProviderId?: string | null;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  relatedItemName?: string;
  description: string;
  status: 'قيد المراجعة' | 'تم الاستلام' | 'تمت المعالجة';
  createdAt: string;
  adminReply?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  type: 'booking' | 'complaint' | 'offer' | 'welcome';
  targetBookingId?: string;
  targetHallId?: string;
  targetProviderId?: string;
  read: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  accountType: AccountType;
  ownedHallId?: string;
  ownedProviderId?: string;
  isGuest?: boolean;
  isGuestConverted?: boolean;
  profileCompleted?: boolean;
  hallName?: string;
  serviceCategory?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
