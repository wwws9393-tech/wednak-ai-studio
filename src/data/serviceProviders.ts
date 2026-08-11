import { ServiceProvider } from '../types';

export const INITIAL_SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    id: 'provider-1',
    ownerId: 'provider-user-1',
    name: 'استوديو العريس الملكي للتصوير',
    serviceCategory: 'تصوير وفيديو',
    city: 'بغداد',
    location: 'بغداد - المنصور',
    rating: 4.9,
    reviewsCount: 189,
    priceStart: 600000,
    priceStartFormatted: '600,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'تغطية سينمائية كاملة لحفلات الزفاف بكاميرات 4K وطائرات Dron، مع ألبومات حرارية فاخرة وفيديو كليب هوداي خصيصاً للعروسين.',
    phone: '07701234567',
    isVerified: true
  },
  {
    id: 'provider-2',
    ownerId: 'provider-user-2',
    name: 'مركز رويال بيوتي - لمكياج العرائس',
    serviceCategory: 'صالون ومكياج عرائس',
    city: 'أربيل',
    location: 'أربيل - شارع 100م',
    rating: 4.9,
    reviewsCount: 210,
    priceStart: 450000,
    priceStartFormatted: '450,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'خبيرات مكياج عالميات، تسريحات عرايس طراز تركي وأوروبي، عناية بالبشرة وباقة حناء متكاملة مع جناح خاص للحجز.',
    phone: '07509876543',
    isVerified: true
  },
  {
    id: 'provider-3',
    ownerId: 'provider-user-3',
    name: 'مؤسسة زفة زمان للفرق الموسيقية',
    serviceCategory: 'فرقة وسنترال',
    city: 'بغداد',
    location: 'بغداد - الكرادة',
    rating: 4.8,
    reviewsCount: 145,
    priceStart: 500000,
    priceStartFormatted: '500,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'زفة بغدادية ومصرية وشامية بالطبول والمزامير والخيول العربية، مع دي جي وأجهزة ليزر صوتية ضخمة.',
    phone: '07801122334',
    isVerified: true
  },
  {
    id: 'provider-4',
    ownerId: 'provider-user-4',
    name: 'شركة الفخامة لسيارات الأعراس الكلاسيكية والمكشوفة',
    serviceCategory: 'سيارات زفاف',
    city: 'البصرة',
    location: 'البصرة - الجزئية',
    rating: 4.7,
    reviewsCount: 92,
    priceStart: 300000,
    priceStartFormatted: '300,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'تأجير أحدث سيارات كرايسلر ورولز رايس وسيارات مكشوفة ملونة ومزينة بالسقوف والورد الطبيعي مع سائق خاص بزي رسمي.',
    phone: '07715544332',
    isVerified: true
  },
  {
    id: 'provider-5',
    ownerId: 'provider-user-5',
    name: 'زهور وكوشات قصر الأحلام',
    serviceCategory: 'تزيين وكوشة',
    city: 'النجف',
    location: 'النجف - حي الأسطى',
    rating: 4.9,
    reviewsCount: 130,
    priceStart: 700000,
    priceStartFormatted: '700,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
    portfolio: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'تصميم وتنفيذ أحدث كوشات العرائس من الزهور الطبيعية والمضيئة وممرات ورود مدخل القاعة بالكامل.',
    phone: '07819988776',
    isVerified: true
  }
];
