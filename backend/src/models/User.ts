import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'student' | 'owner' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  hashedPassword: string;
  role: UserRole;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    phone: { type: String, required: true },
    hashedPassword: { type: String, required: true },
    role: { type: String, enum: ['student', 'owner', 'admin'], required: true, default: 'student' },
    tokenVersion: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
