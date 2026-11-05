require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ProviderProfile = require('./models/ProviderProfile');
const ServiceCategory = require('./models/ServiceCategory');
const Booking = require('./models/Booking');
const Review = require('./models/Review');

const seedData = async (dontExit = false) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/service_hub');
    }
    console.log('[Seed] Database connected and ready to seed');

    // Clear old data
    await User.deleteMany();
    await ProviderProfile.deleteMany();
    await ServiceCategory.deleteMany();
    await Booking.deleteMany();
    await Review.deleteMany();

    console.log('[Seed] Existing collections cleared');

    // 1. Seed Categories
    const categories = await ServiceCategory.insertMany([
      { name: 'Plumbing', icon: 'wrench', description: 'Pipe leaks, faucet repairs, water heaters, drain snaking' },
      { name: 'Electrical', icon: 'zap', description: 'Wiring, light fixtures, switch repairs, circuit breakers' },
      { name: 'Cleaning', icon: 'sparkles', description: 'Full home deep cleaning, kitchen sanitizing, carpet care' },
      { name: 'Carpentry', icon: 'hammer', description: 'Furniture repair, door locks, cabinets, framing' },
      { name: 'Appliances', icon: 'cpu', description: 'Refrigerators, washing machines, dishwashers, AC repair' },
      { name: 'Painting', icon: 'brush', description: 'Interior/exterior walls, touchups, trim painting' },
    ]);
    console.log('[Seed] Service categories created');

    // 2. Seed Admin
    const admin = await User.create({
      name: 'Super Administrator',
      email: 'super@admin.com',
      password: 'admin123',
      phone: '+1 555-0100',
      role: 'admin',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    // 3. Seed Customer
    const customer = await User.create({
      name: 'Sarah Jenkins',
      email: 'customer@servicehub.com',
      password: 'password123',
      phone: '+1 555-0199',
      role: 'customer',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    // 4. Seed Provider 1: Kumar Plumbing Solutions
    const kumarUser = await User.create({
      name: 'Kumar Plumbing Solutions',
      email: 'provider@servicehub.com',
      password: 'password123',
      phone: '+1 555-0144',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    const kumarProfile = await ProviderProfile.create({
      userId: kumarUser._id,
      category: 'Plumbing',
      bio: 'Master Plumber with over 8 years experience in residential pipe repair, drain snaking, and fixture installations.',
      experience: '8+ years',
      qualifications: ['Licensed Master Plumber', 'OSHA Safety Certified', 'Backflow Prevention Specialist'],
      hourlyRate: 40,
      workImages: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      ],
      location: {
        type: 'Point',
        coordinates: [80.2337, 13.0418], // T. Nagar, Chennai
        address: '42 Usman Road, T. Nagar, Chennai - 600017',
      },
      workingHours: { open: '08:00 AM', close: '07:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      averageRating: 4.8,
      totalReviews: 94,
      totalEarnings: 2840,
      isAvailable: true,
    });

    // 5. Seed Provider 2: Apex Electrical Services
    const apexUser = await User.create({
      name: 'Apex Electrical Services',
      email: 'apex@servicehub.com',
      password: 'password123',
      phone: '+1 555-0177',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    await ProviderProfile.create({
      userId: apexUser._id,
      category: 'Electrical',
      bio: 'Certified residential and commercial electrician specializing in panel upgrades, rewiring, and safety inspections.',
      experience: '10+ years',
      qualifications: ['Licensed Master Electrician', 'Infrared Thermography Certified'],
      hourlyRate: 45,
      location: {
        type: 'Point',
        coordinates: [80.2100, 13.0850], // Anna Nagar, Chennai
        address: '2nd Avenue, Anna Nagar East, Chennai - 600102',
      },
      averageRating: 4.9,
      totalReviews: 128,
      totalEarnings: 3950,
      isAvailable: true,
    });

    // 6. Seed Provider 3: SparkleClean Pro Services (Elena Rostova)
    const elenaUser = await User.create({
      name: 'SparkleClean Pro Services',
      email: 'elena@servicehub.com',
      password: 'password123',
      phone: '+1 555-0211',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    await ProviderProfile.create({
      userId: elenaUser._id,
      category: 'Cleaning',
      bio: 'Eco-friendly deep cleaning, move-out sanitizing, post-renovation cleanup, and high-temperature carpet revival.',
      experience: '6+ years',
      qualifications: ['Green Clean Institute Certified', 'IICRC Carpet Tech', 'Bonded & Insured'],
      hourlyRate: 35,
      location: {
        type: 'Point',
        coordinates: [80.2565, 12.9975], // Adyar, Chennai
        address: '15 Sardar Patel Road, Adyar, Chennai - 600020',
      },
      averageRating: 4.95,
      totalReviews: 186,
      totalEarnings: 4320,
      isAvailable: true,
    });

    // 7. Seed Provider 4: MasterCraft Wood & Joinery (Marcus Vance)
    const marcusUser = await User.create({
      name: 'MasterCraft Wood & Joinery',
      email: 'marcus@servicehub.com',
      password: 'password123',
      phone: '+1 555-0233',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    await ProviderProfile.create({
      userId: marcusUser._id,
      category: 'Carpentry',
      bio: 'Bespoke woodwork, custom cabinet installations, interior door adjustments, and heirloom furniture restoration.',
      experience: '12+ years',
      qualifications: ['Guild of Master Craftsmen', 'Architectural Millwork Certified', 'OSHA 30'],
      hourlyRate: 55,
      location: {
        type: 'Point',
        coordinates: [80.2676, 13.0368], // Mylapore, Chennai
        address: '78 Kutchery Road, Mylapore, Chennai - 600004',
      },
      averageRating: 4.88,
      totalReviews: 73,
      totalEarnings: 5100,
      isAvailable: true,
    });

    // 8. Seed Provider 5: QuickFix Smart Appliances (David Chen)
    const davidUser = await User.create({
      name: 'QuickFix Smart Appliances',
      email: 'david@servicehub.com',
      password: 'password123',
      phone: '+1 555-0255',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    await ProviderProfile.create({
      userId: davidUser._id,
      category: 'Appliances',
      bio: 'Factory-certified technician for all major brands of refrigerators, washing machines, dryers, dishwashers, and ovens.',
      experience: '7+ years',
      qualifications: ['EPA 608 Universal Certified', 'Major Appliance Service Tech (NASTeC)', 'Samsung & LG Certified'],
      hourlyRate: 48,
      location: {
        type: 'Point',
        coordinates: [80.2184, 12.9815], // Velachery, Chennai
        address: '100 Feet Bypass Road, Velachery, Chennai - 600042',
      },
      averageRating: 4.92,
      totalReviews: 115,
      totalEarnings: 3780,
      isAvailable: true,
    });

    // 9. Seed Provider 6: Artistry Interior & Exterior Painting (Sofia Martinez)
    const sofiaUser = await User.create({
      name: 'Artistry Painting Studio',
      email: 'sofia@servicehub.com',
      password: 'password123',
      phone: '+1 555-0277',
      role: 'provider',
      isVerified: true,
      isApproved: true,
      profileImage: '',
    });

    await ProviderProfile.create({
      userId: sofiaUser._id,
      category: 'Painting',
      bio: 'Premium precision painting, wall priming, smooth finish drywall patching, and modern architectural color styling.',
      experience: '9+ years',
      qualifications: ['PCA Master Painter', 'Lead-Safe EPA Certified', 'Commercial & Residential Specialist'],
      hourlyRate: 42,
      location: {
        type: 'Point',
        coordinates: [80.2425, 13.0626], // Nungambakkam, Chennai
        address: '12 College Road, Nungambakkam, Chennai - 600006',
      },
      averageRating: 4.85,
      totalReviews: 88,
      totalEarnings: 3150,
      isAvailable: true,
    });

    // 10. Seed Multiple Sample Bookings across All Statuses
    // Booking 1: Accepted (Plumbing)
    await Booking.create({
      customerId: customer._id,
      providerId: kumarUser._id,
      categoryId: categories[0]._id,
      categoryName: 'Plumbing',
      serviceAddress: '742 Anna Salai, T. Nagar, Chennai - 600017',
      scheduledDate: '2026-10-29',
      scheduledTime: '11:30 AM',
      description: 'Persistent active water leakage under the kitchen sink basin.',
      status: 'accepted',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      totalAmount: 40.0,
    });

    // Booking 2: Ongoing (Electrical)
    await Booking.create({
      customerId: customer._id,
      providerId: apexUser._id,
      categoryId: categories[1]._id,
      categoryName: 'Electrical',
      serviceAddress: '742 Anna Salai, T. Nagar, Chennai - 600017',
      scheduledDate: '2026-10-25',
      scheduledTime: '02:00 PM',
      description: 'Main breaker safety check and living room dimmer switch installation.',
      status: 'ongoing',
      paymentMethod: 'online',
      paymentStatus: 'paid',
      totalAmount: 90.0,
    });

    // Booking 3: Pending (Cleaning)
    await Booking.create({
      customerId: customer._id,
      providerId: elenaUser._id,
      categoryId: categories[2]._id,
      categoryName: 'Cleaning',
      serviceAddress: '742 Anna Salai, T. Nagar, Chennai - 600017',
      scheduledDate: '2026-11-02',
      scheduledTime: '09:00 AM',
      description: 'Full 3-bedroom eco-friendly deep cleaning and kitchen disinfection.',
      status: 'pending',
      paymentMethod: 'online',
      paymentStatus: 'pending',
      totalAmount: 140.0,
    });

    // Booking 4: Completed (Carpentry)
    const completedCarpentryBooking = await Booking.create({
      customerId: customer._id,
      providerId: marcusUser._id,
      categoryId: categories[3]._id,
      categoryName: 'Carpentry',
      serviceAddress: '742 Anna Salai, T. Nagar, Chennai - 600017',
      scheduledDate: '2026-09-18',
      scheduledTime: '10:00 AM',
      description: 'Hardwood closet door alignment and heavy shelf mounting.',
      status: 'completed',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      totalAmount: 110.0,
      completionProof: {
        photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
        reason: 'Hardwood closet door realigned and shelves reinforced.',
        completedAt: new Date('2026-09-18T11:30:00Z'),
      },
    });

    // Booking 5: Completed (Plumbing)
    const completedPlumbingBooking = await Booking.create({
      customerId: customer._id,
      providerId: kumarUser._id,
      categoryId: categories[0]._id,
      categoryName: 'Plumbing',
      serviceAddress: '42 Usman Road, T. Nagar, Chennai - 600017',
      scheduledDate: '2026-09-20',
      scheduledTime: '11:00 AM',
      description: 'Kitchen water pipe leak repair and new brass valve installation.',
      status: 'completed',
      paymentMethod: 'online',
      paymentStatus: 'paid',
      totalAmount: 48.0,
      completionProof: {
        photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
        reason: 'Joint seal replaced successfully.',
        completedAt: new Date('2026-09-20T12:00:00Z'),
      },
    });

    // 11. Seed Customer Reviews for Providers
    await Review.create([
      {
        bookingId: completedPlumbingBooking._id,
        customerId: customer._id,
        providerId: kumarUser._id,
        rating: 5,
        reviewText: 'Arrived right on time in T. Nagar! Fixed the persistent pipe leak under our sink swiftly and left the workspace spotless.',
        serviceQuality: 5,
        providerBehavior: 5,
        sentimentScore: 98,
        sentimentLabel: 'Positive',
      },
      {
        bookingId: completedCarpentryBooking._id,
        customerId: customer._id,
        providerId: marcusUser._id,
        rating: 5,
        reviewText: 'Master craftsman quality! The custom shelves are sturdy and the alignment of the closet door is perfect.',
        serviceQuality: 5,
        providerBehavior: 5,
        sentimentScore: 97,
        sentimentLabel: 'Positive',
      },
    ]);

    console.log('==================================================');
    console.log(' SEED DATA POPULATED SUCCESSFULLY!');
    console.log(' Demo Accounts:');
    console.log('   Admin:    super@admin.com    / admin123');
    console.log('   Provider: provider@servicehub.com / password123');
    console.log('   Customer: customer@servicehub.com / password123');
    console.log('==================================================');

    if (!dontExit) {
      process.exit(0);
    }
    return true;
  } catch (error) {
    console.error('[Seed Error]', error);
    if (!dontExit) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData(false);
}

module.exports = seedData;
