import { Hall } from '../types';

export const INITIAL_HALLS: Hall[] = [
  {
    id: 'hall-1',
    ownerId: 'owner-1',
    name: 'قاعة الملكة الفاخرة',
    location: 'بغداد - الجادرية',
    city: 'بغداد',
    price: 3500000,
    priceFormatted: '3,500,000 د.ع',
    capacity: 500,
    rating: 4.9,
    reviewsCount: 128,
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'من أرقى قاعات المناسبات والأعراس في بغداد، تتميز بديكورات ملكية حديثة، كوشة عرايس فاخرة، نظام إضاءة وصوت متطور، وبوفيه مفتوح شامخ يناسب أرقى الحفلات.',
    deposit: 500000,
    depositFormatted: '500,000 د.ع',
    features: ['كوشة ملكية فاخرة', 'بوفيه مفتوح شرقي وغربي', 'نظام ليزر وإضاءة متحركة', 'فريق ضيافة رجالي ونسائي', 'شاشات عرض عملاقة', 'جناح خاص للعروسين', 'موقف سيارات مظلل'],
    category: 'قاعات فخمة',
    isFeatured: true
  },
  {
    id: 'hall-2',
    ownerId: 'owner-2',
    name: 'قاعة الأوركيد الماسية',
    location: 'أربيل - طريق عنكاوة',
    city: 'أربيل',
    price: 4200000,
    priceFormatted: '4,200,000 د.ع',
    capacity: 700,
    rating: 4.8,
    reviewsCount: 95,
    images: [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'قاعة واسعة بتصميم أوروبي ساحر في قلب أربيل، تناسب الأعراس الكبيرة والمؤتمرات. تجهيزات حديثة بالكامل مع طاقم خدمة احترافي وعروض تصوير فيديو وفاخرة.',
    deposit: 600000,
    depositFormatted: '600,000 د.ع',
    features: ['سعة ضخمة تصل لـ 700 شخص', 'مسرح عروض وإضاءة سينمائية', 'تصوير احترافي Dron/4K', 'مأكولات ومشروبات فاخرة', 'تكييف مركزي متطور', 'خدمة صف السيارات Valet'],
    category: 'قاعات فخمة',
    isFeatured: true
  },
  {
    id: 'hall-3',
    ownerId: 'owner-3',
    name: 'حدائق اليرموك للمناسبات',
    location: 'بغداد - اليرموك',
    city: 'بغداد',
    price: 2800000,
    priceFormatted: '2,800,000 د.ع',
    capacity: 350,
    rating: 4.7,
    reviewsCount: 84,
    images: [
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'قاعة خارجية في الهواء الطلق محاطة بالحدائق والأشجار والمحيط المضيء. مثالية لحفلات الزفاف الصيفية، الحناء، وعقود القران بأجواء طبيعية ساحرة.',
    deposit: 400000,
    depositFormatted: '400,000 د.ع',
    features: ['حديقة مفتوحة مضاءة', 'مسبح ديكوري نافورة', 'فرقة موسيقية ودي جي', 'بوفيه مشويات ومقبلات', 'منطقة ألعاب أطفال معزولة'],
    category: 'حدائق ومناطق مفتوحة',
    isFeatured: true
  },
  {
    id: 'hall-4',
    ownerId: 'owner-4',
    name: 'قاعة قصر الفخامة',
    location: 'النجف - شارع الكوفة',
    city: 'النجف',
    price: 2500000,
    priceFormatted: '2,500,000 د.ع',
    capacity: 450,
    rating: 4.6,
    reviewsCount: 110,
    images: [
      'https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'قاعة أعراس ومناسبات تتميز بخصوصيتها العالية، صالتين منفصلتين تماماً للرجال والنساء، وخدمة ضيافة عربية أصيلة مع عشاء فخم.',
    deposit: 350000,
    depositFormatted: '350,000 د.ع',
    features: ['صالتان منفصلتان تماماً', 'ضيافة قهوة وشاي عربية', 'كوشة إلكترونية قابلة للتغيير', 'بوفيه عشاء متنوع', 'مولدات طاقة احتياطية 100%'],
    category: 'قاعات متوسطة'
  },
  {
    id: 'hall-5',
    ownerId: 'owner-5',
    name: 'قاعة الشيراتون الكبرى',
    location: 'البصرة - كورنيش شط العرب',
    city: 'البصرة',
    price: 5000000,
    priceFormatted: '5,000,000 د.ع',
    capacity: 600,
    rating: 4.9,
    reviewsCount: 142,
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545232979-fbf5963d13a2?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'قاعة فندق الشيراتون المطلة على شط العرب في البصرة، الخدمة الفندقية الخمس نجوم والأطباق العالمية، لتجربة ليلة زفاف لا تُنسى.',
    deposit: 750000,
    depositFormatted: '750,000 د.ع',
    features: ['إقامة مجانية للعروسين بالفندق', 'إطلالة على شط العرب', 'طهاة عالميون للبوفيه', 'مصور سينمائي مع ألبوم فاخر', 'مدخل خاص للضيوف'],
    category: 'قاعات فنادق',
    isFeatured: true
  },
  {
    id: 'hall-6',
    ownerId: 'owner-6',
    name: 'قاعة اللؤلؤة البيضاء',
    location: 'كربلاء - طريق الحسينية',
    city: 'كربلاء',
    price: 2200000,
    priceFormatted: '2,200,000 د.ع',
    capacity: 300,
    rating: 4.5,
    reviewsCount: 67,
    images: [
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80'
    ],
    description: 'قاعة أنيقة وهادئة لجميع المناسبات السعيدة، تتميز بأسعارها المناسبة والديكورات الناعمة الهادئة مع خدمة ممتازة.',
    deposit: 300000,
    depositFormatted: '300,000 د.ع',
    features: ['أسعار مناسبة', 'تكييف كامل', 'دي جي وإضاءة هادئة', 'بوفيه حليويات ومشروبات', 'مواقف خاصة'],
    category: 'قاعات متوسطة'
  }
];
