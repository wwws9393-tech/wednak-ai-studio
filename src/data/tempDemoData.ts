import { Hall, ServiceProvider } from '../types';

export const TEMP_DEMO_HALLS: Hall[] = [
  {
    id: 'demo-hall-baghdad-1', ownerId: 'demo-owner-hall-1', name: 'قاعة قصر الورد',
    location: 'المنصور', city: 'بغداد', price: 3500000, priceFormatted: '3,500,000 د.ع', capacity: 450,
    rating: 4.8, reviewsCount: 124,
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=85'
    ],
    coverImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85',
    profileImageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=400&q=80',
    phone: '07700001001', description: 'قاعة تجريبية مؤقتة بتصميم فاخر ومسرح واسع ومنطقة مخصصة للعروسين.',
    deposit: 500000, depositFormatted: '500,000 د.ع', features: ['تكييف مركزي', 'مسرح', 'غرفة عروس', 'موقف سيارات'], category: 'قاعات فخمة', isFeatured: true,
  },
  {
    id: 'demo-hall-diwaniya-1', ownerId: 'demo-owner-hall-2', name: 'قاعة ليالي الديوانية',
    location: 'شارع الجزائر', city: 'الديوانية', price: 2200000, priceFormatted: '2,200,000 د.ع', capacity: 320,
    rating: 4.6, reviewsCount: 78,
    images: [
      'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85'
    ],
    coverImage: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85',
    profileImageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80',
    phone: '07800001002', description: 'نموذج مؤقت لقاعة عصرية مناسبة للأعراس والمناسبات العائلية.',
    deposit: 300000, depositFormatted: '300,000 د.ع', features: ['إضاءة احترافية', 'صوتيات', 'ممر عروس'], category: 'قاعات متوسطة',
  },
  {
    id: 'demo-hall-najaf-1', ownerId: 'demo-owner-hall-3', name: 'قاعة رويال النجف',
    location: 'حي الأمير', city: 'النجف', price: 4100000, priceFormatted: '4,100,000 د.ع', capacity: 520,
    rating: 4.9, reviewsCount: 201,
    images: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85'
    ],
    coverImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=85',
    profileImageUrl: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=400&q=80',
    phone: '07700001003', description: 'قاعة تجريبية كبيرة مع مساحة واسعة للضيوف وتجهيزات فخمة.',
    deposit: 600000, depositFormatted: '600,000 د.ع', features: ['VIP', 'بوفيه', 'موقف سيارات', 'مولدة خاصة'], category: 'قاعات فخمة', isFeatured: true,
  },
  {
    id: 'demo-hall-basra-1', ownerId: 'demo-owner-hall-4', name: 'حدائق البصرة للأفراح',
    location: 'الجزائر', city: 'البصرة', price: 2800000, priceFormatted: '2,800,000 د.ع', capacity: 380,
    rating: 4.7, reviewsCount: 95,
    images: ['https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85'],
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85',
    profileImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80',
    phone: '07800001004', description: 'نموذج مؤقت لمساحة أفراح خارجية بديكور حدائقي.',
    deposit: 400000, depositFormatted: '400,000 د.ع', features: ['حديقة', 'جلسات خارجية', 'كوشة'], category: 'حدائق ومناطق مفتوحة',
  },
];

export const TEMP_DEMO_PROVIDERS: ServiceProvider[] = [
  {
    id: 'demo-provider-photo-1', ownerId: 'demo-owner-provider-1', name: 'ستوديو لقطة بغداد', serviceCategory: 'تصوير وفيديو',
    city: 'بغداد', location: 'الكرادة', rating: 4.9, reviewsCount: 148, priceStart: 450000, priceStartFormatted: '450,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=85',
    portfolio: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85'
    ],
    description: 'تصوير أعراس وفيديو سينمائي — نموذج مؤقت للعرض.', phone: '07700002001', isVerified: true,
  },
  {
    id: 'demo-provider-decor-1', ownerId: 'demo-owner-provider-2', name: 'لمسة كوشة', serviceCategory: 'تزيين وكوشة',
    city: 'الديوانية', location: 'حي الجامعة', rating: 4.7, reviewsCount: 83, priceStart: 300000, priceStartFormatted: '300,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85',
    portfolio: ['https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85'],
    description: 'تنسيق كوشات وورد وطاولات بطابع عصري — نموذج مؤقت.', phone: '07800002002', isVerified: true,
  },
  {
    id: 'demo-provider-makeup-1', ownerId: 'demo-owner-provider-3', name: 'بيوتي برايد', serviceCategory: 'صالون ومكياج عرائس',
    city: 'النجف', location: 'شارع الروان', rating: 4.8, reviewsCount: 112, priceStart: 250000, priceStartFormatted: '250,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1400&q=85',
    portfolio: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85'],
    description: 'مكياج وتسريحات للعرائس — نموذج تجريبي مؤقت.', phone: '07700002003', isVerified: true,
  },
  {
    id: 'demo-provider-buffet-1', ownerId: 'demo-owner-provider-4', name: 'مذاق للأفراح', serviceCategory: 'ضيافة وبوفيه',
    city: 'البصرة', location: 'العشار', rating: 4.6, reviewsCount: 67, priceStart: 700000, priceStartFormatted: '700,000 د.ع',
    avatar: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400&q=80',
    coverImage: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1400&q=85',
    portfolio: ['https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=85'],
    description: 'بوفيهات وضيافة للمناسبات — نموذج مؤقت للاختبار.', phone: '07800002004', isVerified: false,
  },
];
