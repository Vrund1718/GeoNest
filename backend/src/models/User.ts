import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'student' | 'owner' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true, maxlength: 20 },
    role: { type: String, enum: ['student', 'owner', 'admin'], default: 'student' },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
