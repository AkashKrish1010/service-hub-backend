const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'provider', 'admin'],
      default: 'customer',
    },
    profileImage: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false, // Providers require admin approval
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
