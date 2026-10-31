const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');

// Helper to call Google Gemini API with model gemini-3.5-flash-lite
const callGemini = async (contents, systemInstruction = '', fallbackGenerator = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    if (fallbackGenerator) return fallbackGenerator();
    throw new Error('Gemini API key not configured in environment');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }],
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const text = data.candidates[0].content.parts.map((p) => p.text).join('\n');
      return text;
    }

    if (data.error) {
      console.warn('[Gemini API Warning]', data.error.message || data.error);
    }

    if (fallbackGenerator) return fallbackGenerator();
    return '';
  } catch (err) {
    console.warn('[Gemini Service Error]', err.message);
    if (fallbackGenerator) return fallbackGenerator();
    throw err;
  }
};

// Clean JSON response from Gemini (strips markdown formatting or trailing artifacts)
const cleanJsonParse = (rawText, defaultFallback) => {
  try {
    if (!rawText || typeof rawText !== 'string') return defaultFallback;
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    console.warn('[AI JSON Parse Warning] Using fallback:', e.message);
    return defaultFallback;
  }
};

// Helper: Build standard platform JSON context
const getStandardPlatformContext = async () => {
  try {
    const providers = await ProviderProfile.find({ isAvailable: true })
      .populate('userId', 'name email phone profileImage isVerified')
      .limit(10);

    const providerList = providers.map((p) => ({
      providerId: p.userId ? p.userId._id.toString() : p._id.toString(),
      name: p.userId ? p.userId.name : 'Verified Professional',
      category: p.category,
      hourlyRate: p.hourlyRate,
      averageRating: p.averageRating,
      totalReviews: p.totalReviews,
      experience: p.experience || '3+ years',
      isAvailable: p.isAvailable,
      bio: p.bio || '',
    }));

    return {
      appName: 'Service Hub',
      platformOverview: 'Connecting verified local service professionals with customers for home and utility maintenance.',
      categories: ['Plumbing', 'Electrical', 'Cleaning', 'Appliances', 'Carpentry', 'Painting'],
      availableProviders: providerList,
      policies: {
        booking: 'Instant in-app scheduling with direct provider assignment.',
        pricing: 'Transparent hourly rates with direct settlement.',
        quality: 'Mandatory photo verification upon repair completion.',
        safety: 'Certified and identity-verified professionals with user ratings and review moderation.',
      },
    };
  } catch (e) {
    return {
      appName: 'Service Hub',
      categories: ['Plumbing', 'Electrical', 'Cleaning', 'Appliances', 'Carpentry'],
      availableProviders: [],
    };
  }
};

// @desc    Smart Provider Recommendation
// @route   POST /api/ai/recommend
// @access  Public
exports.recommendProviders = async (req, res, next) => {
  try {
    const { preferredCategory = 'Plumbing', location = 'Downtown' } = req.body;

    const providers = await ProviderProfile.find({ isAvailable: true })
      .populate('userId', 'name email phone profileImage isVerified')
      .sort({ averageRating: -1 })
      .limit(5);

    const recommendations = providers.slice(0, 3).map((p, index) => {
      const distance = (0.8 + index * 0.4).toFixed(1);
      const name = p.userId ? p.userId.name : 'Verified Professional';
      return {
        providerId: p.userId ? p.userId._id : p._id,
        name: name,
        category: p.category,
        hourlyRate: p.hourlyRate,
        rating: p.averageRating,
        reviewsCount: p.totalReviews,
        distance: `${distance} km`,
        profileImage: p.userId ? p.userId.profileImage : '',
        reason: `Based on your interest in ${p.category} around ${location}, ${name} is top-rated (${p.averageRating} stars) with verified field experience.`,
      };
    });

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    AI Chat Assistant with standard platform JSON context & strict guardrails
// @route   POST /api/ai/chat
// @access  Public
exports.chatAssistant = async (req, res, next) => {
  try {
    const { message = '', history = [] } = req.body;
    const lowerMsg = message.toLowerCase();

    // 1. Fetch live standard JSON context
    const platformContext = await getStandardPlatformContext();

    // 2. Identify relevant category for rich UI suggestions
    let matchedCategory = 'Plumbing';
    if (lowerMsg.includes('electric') || lowerMsg.includes('light') || lowerMsg.includes('wire') || lowerMsg.includes('switch') || lowerMsg.includes('power')) {
      matchedCategory = 'Electrical';
    } else if (lowerMsg.includes('clean') || lowerMsg.includes('maid') || lowerMsg.includes('mop') || lowerMsg.includes('dust')) {
      matchedCategory = 'Cleaning';
    } else if (lowerMsg.includes('ac') || lowerMsg.includes('cooling') || lowerMsg.includes('refrigerat') || lowerMsg.includes('appliance')) {
      matchedCategory = 'Appliances';
    } else if (lowerMsg.includes('carpent') || lowerMsg.includes('wood') || lowerMsg.includes('door') || lowerMsg.includes('furniture')) {
      matchedCategory = 'Carpentry';
    } else if (lowerMsg.includes('paint') || lowerMsg.includes('wall') || lowerMsg.includes('stain')) {
      matchedCategory = 'Painting';
    }

    const matchedProviders = await ProviderProfile.find({
      category: new RegExp(matchedCategory, 'i'),
      isAvailable: true,
    })
      .populate('userId', 'name email phone profileImage')
      .limit(2);

    const providerCards = matchedProviders.map((p, idx) => ({
      providerId: p.userId ? p.userId._id : p._id,
      name: p.userId ? p.userId.name : 'Verified Pro',
      category: p.category,
      rating: p.averageRating,
      reviewsCount: p.totalReviews,
      hourlyRate: p.hourlyRate,
      distance: `${(0.8 + idx * 0.5).toFixed(1)} km away`,
      profileImage: p.userId ? p.userId.profileImage : '',
    }));

    // 3. Construct System Prompt with standard JSON and strict domain boundaries
    const systemPrompt = `You are the Service Hub AI Concierge.
Standard Platform JSON Data:
${JSON.stringify(platformContext)}

CRITICAL RULES:
1. ONLY answer queries directly related to Service Hub, local utility and home repair services (Plumbing, Electrical, Cleaning, Appliances, Carpentry, Painting), booking available providers from the JSON data, pricing estimates, and repair problem summaries.
2. STRICT RESTRICTION: DO NOT answer random, general knowledge, political, mathematical, philosophical, entertainment, academic, coding, or off-topic queries.
   If the user asks an off-topic query, politely decline: "I am the Service Hub AI assistant. I can only assist with home utility and maintenance services, finding verified providers, and service bookings on Service Hub."
3. STRICTLY NO EMOJIS anywhere in your responses. Keep responses professional, helpful, and concise (2 to 4 sentences).
4. When relevant, reference actual providers from the availableProviders JSON with their hourly rates and rating.
5. If the user asks for a summary of their issue or a work order, provide a clear, concise professional summary.`;

    // 4. Map conversational history for Gemini
    const contents = [];
    (history || []).slice(-6).forEach((h) => {
      const role = h.role === 'user' ? 'user' : 'model';
      const text = h.content || h.text || '';
      if (text.trim()) {
        contents.push({ role, parts: [{ text }] });
      }
    });

    contents.push({ role: 'user', parts: [{ text: message }] });

    // Fallback generator
    const fallbackResponse = () => {
      return `I understand you need assistance with ${matchedCategory.toLowerCase()} services. We have verified ${matchedCategory.toLowerCase()} professionals ready for immediate dispatch on Service Hub.`;
    };

    const aiText = await callGemini(contents, systemPrompt, fallbackResponse);

    res.status(200).json({
      success: true,
      reply: aiText.replace(/[^\x00-\x7F]/g, ''), // Ensure no stray emoji characters
      category: matchedCategory,
      suggestions: providerCards,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin Revenue Optimization & Growth Insights (Powered by Gemini)
// @route   GET /api/ai/admin-revenue-insights
// @access  Private (Admin only)
exports.adminRevenueInsights = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalBookings,
      activeBookings,
      openComplaints,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ['accepted', 'ongoing'] } }),
      Complaint.countDocuments({ status: 'open' }),
    ]);

    const completedBookings = await Booking.find({ status: 'completed' });
    const grossRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformCommission = Math.round(grossRevenue * 0.15 * 100) / 100; // 15% platform commission

    // Fetch provider category distribution
    const providerProfiles = await ProviderProfile.find();
    const categoryCounts = {};
    providerProfiles.forEach((p) => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const metricsPayload = {
      grossRevenue,
      platformCommission,
      commissionRate: '15%',
      totalBookings,
      completedBookings: completedBookings.length,
      activeBookings,
      openComplaints,
      totalUsers,
      totalCustomers,
      totalProviders,
      categoryDistribution: categoryCounts,
    };

    const prompt = `You are a Chief Revenue Officer and Marketplace Growth Consultant for Service Hub.
Analyze the following operational and financial platform data:
${JSON.stringify(metricsPayload)}

Provide concrete, actionable, data-driven revenue optimization insights on how to improve overall platform revenue and increase commission earnings.
Focus on:
1. Monetizing underutilized or high-demand service categories.
2. Improving conversion from active bookings to completed settlements.
3. Pricing and commission tier opportunities (e.g. premium rush jobs, weekend rates).
4. Provider liquidity and supply depth improvements.

Output a valid JSON object ONLY with the following exact structure:
{
  "summary": "Concise 2-sentence executive summary of platform revenue health and opportunity.",
  "growthPotential": "Estimated realistic percentage revenue upside (e.g. +24%)",
  "strategies": [
    {
      "title": "Strategy Name",
      "impact": "High" | "Medium",
      "projectedUplift": "+XX%",
      "recommendation": "Detailed insight on why and what to adjust",
      "action": "Concrete operational step for the admin team to implement"
    }
  ]
}
STRICT RULES: Output raw JSON only. Do not wrap in markdown or code blocks. Strictly no emojis.`;

    const rawResponse = await callGemini(
      [{ parts: [{ text: prompt }] }],
      'You are a high-level business intelligence and marketplace revenue strategist. Respond strictly in valid JSON without markdown fences and without emojis.'
    );

    const defaultFallback = {
      summary: `Current gross platform volume is $${grossRevenue.toFixed(2)} with $${platformCommission.toFixed(2)} collected in commission across ${completedBookings.length} completed transactions.`,
      growthPotential: '+25%',
      strategies: [
        {
          title: 'Emergency and Peak-Hour Surge Commission',
          impact: 'High',
          projectedUplift: '+18%',
          recommendation: 'Implement a 20% commission tier for emergency off-hours service calls (evenings and weekends) where customer willingness to pay is highest.',
          action: 'Enable peak-hour surge toggles for plumbing and electrical emergency bookings.',
        },
        {
          title: 'High-Demand Category Provider Recruitment',
          impact: 'High',
          projectedUplift: '+22%',
          recommendation: 'Expand provider supply in underserved categories like Appliances and Carpentry to capture unfulfilled customer search intent.',
          action: 'Offer reduced 10% promotional commission for the first month to newly onboarded specialty providers.',
        },
        {
          title: 'Recurring Maintenance Subscription Packages',
          impact: 'Medium',
          projectedUplift: '+15%',
          recommendation: 'Introduce quarterly HVAC and plumbing checkup packages to convert one-off repair customers into predictable recurring revenue.',
          action: 'Package seasonal maintenance checkups with automated booking reminders.',
        },
      ],
    };

    const parsedInsights = cleanJsonParse(rawResponse, defaultFallback);

    res.status(200).json({
      success: true,
      data: {
        ...parsedInsights,
        metrics: metricsPayload,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Service Provider Performance & Growth Insights (Powered by Gemini)
// @route   GET /api/ai/provider-insights
// @access  Private (Provider only)
exports.providerPerformanceInsights = async (req, res, next) => {
  try {
    const providerId = req.user.id;

    // Fetch provider profile
    const profile = await ProviderProfile.findOne({ userId: providerId });
    const user = await User.findById(providerId);

    // Fetch all customer reviews for this provider
    const reviews = await Review.find({ providerId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(15);

    // Fetch completed bookings for this provider
    const completedBookings = await Booking.find({
      providerId,
      status: 'completed',
    });

    const totalEarned = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const reviewsData = reviews.map((r) => ({
      rating: r.rating,
      comment: r.reviewText,
      serviceQuality: r.serviceQuality || 5,
      providerBehavior: r.providerBehavior || 5,
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'Recent',
    }));

    const providerPayload = {
      name: user ? user.name : 'Provider',
      category: profile ? profile.category : 'Home Services',
      hourlyRate: profile ? profile.hourlyRate : 40,
      averageRating: profile ? profile.averageRating : 5.0,
      totalReviews: profile ? profile.totalReviews : reviews.length,
      completedJobs: completedBookings.length,
      totalRevenue: totalEarned,
      customerReviews: reviewsData,
    };

    const prompt = `You are a high-performance business coach and customer satisfaction analyst for home service professionals on Service Hub.
Analyze this service provider's customer reviews, current ratings, and performance data:
${JSON.stringify(providerPayload)}

Generate actionable insights to help this provider improve their customer ratings, eliminate negative review patterns, and maximize booking revenue.
Provide:
1. Executive summary of their customer reputation.
2. Overall sentiment (Positive, Neutral, or Needs Attention).
3. 2-3 specific strengths highlighted in customer feedback.
4. 1-2 areas of improvement or potential customer friction points based on reviews or rating gaps.
5. 3 concrete, practical actionable tips on how to improve more and earn higher revenue (e.g. communication, photo documentation, arrival punctuality, pricing upsells).

Output a valid JSON object ONLY with the following exact structure:
{
  "summary": "Concise 2-sentence summary of customer perception and performance.",
  "sentiment": "Positive" | "Neutral" | "Needs Attention",
  "strengths": [
    "Specific customer-praised strength 1",
    "Specific customer-praised strength 2"
  ],
  "areasForImprovement": [
    "Specific area to refine 1"
  ],
  "actionableTips": [
    {
      "title": "Actionable Tip Title",
      "action": "Concrete, practical step for future jobs"
    }
  ]
}
STRICT RULES: Output raw JSON only. Do not wrap in markdown or code blocks. Strictly no emojis.`;

    const rawResponse = await callGemini(
      [{ parts: [{ text: prompt }] }],
      'You are a service provider coach and customer satisfaction analyst. Output strictly in valid JSON without markdown fences and without emojis.'
    );

    const defaultFallback = {
      summary: `${user ? user.name : 'Your profile'} maintains a strong ${profile ? profile.averageRating : 5.0}-star average across ${profile ? profile.totalReviews : reviews.length} customer reviews with consistent delivery on Service Hub.`,
      sentiment: (profile && profile.averageRating >= 4.5) ? 'Positive' : 'Neutral',
      strengths: [
        'Consistently high job completion reliability and positive direct feedback',
        'Transparent hourly rate structure and dependable customer interactions',
      ],
      areasForImprovement: [
        'Proactive arrival confirmation messages to improve customer punctuality perception',
      ],
      actionableTips: [
        {
          title: 'Document Thorough Before-and-After Photos',
          action: 'Upload clear photos of the completed fix during job closure to build customer trust and prevent disputes.',
        },
        {
          title: 'Send a 15-Minute Pre-Arrival Text',
          action: 'Notify customers when you are en route to reduce missed appointments and secure 5-star punctuality ratings.',
        },
        {
          title: 'Offer Preventive Maintenance Recommendations',
          action: 'Explain what caused the issue and provide tips, which increases tip frequency and repeat booking requests.',
        },
      ],
    };

    const parsedInsights = cleanJsonParse(rawResponse, defaultFallback);

    res.status(200).json({
      success: true,
      data: {
        ...parsedInsights,
        currentRating: profile ? profile.averageRating : 5.0,
        totalReviews: profile ? profile.totalReviews : reviews.length,
        completedJobs: completedBookings.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    AI Booking Description Helper
// @route   POST /api/ai/helper
// @access  Public
exports.descriptionHelper = async (req, res, next) => {
  try {
    const { input } = req.body;
    if (!input || !input.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide problem text' });
    }

    const fallback = () => {
      const clean = input.trim();
      if (clean.toLowerCase().includes('leak')) {
        return 'Urgent pipe inspection required: Persistent active water leakage under the kitchen sink basin with risk of cabinet water damage.';
      }
      if (clean.toLowerCase().includes('wire') || clean.toLowerCase().includes('switch')) {
        return 'Electrical troubleshooting required: Intermittent power failure and sparking switch socket requiring certified safety inspection.';
      }
      if (clean.toLowerCase().includes('clean')) {
        return 'Comprehensive deep cleaning service requested: Complete sanitization of kitchen surfaces, living area floors, and bathroom tiles.';
      }
      return `Professional inspection and service request: ${clean}. Technician required for diagnostic assessment and standard repair.`;
    };

    const systemPrompt =
      'You are an expert service dispatcher. Convert brief, casual problem descriptions into 1-2 sentence concise, professional technical summaries for service technicians. Do not use any emojis.';

    const refined = await callGemini(
      [{ parts: [{ text: input }] }],
      systemPrompt,
      fallback
    );

    const sanitizedRefined = refined.replace(/[^\x00-\x7F]/g, '');

    res.status(200).json({
      success: true,
      original: input,
      refined: sanitizedRefined,
      refinedText: sanitizedRefined,
      data: sanitizedRefined,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    AI Provider Profile Summary
// @route   POST /api/ai/summary
// @access  Public
exports.profileSummary = async (req, res, next) => {
  try {
    const { category = 'Plumbing', experience = '8+ years', rating = 4.8 } = req.body;
    const summary = `Specializes in high-efficiency ${category.toLowerCase()} installations, diagnostics, and repairs with ${experience} of verified field experience and a ${rating}-star customer satisfaction record.`;

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    next(err);
  }
};
