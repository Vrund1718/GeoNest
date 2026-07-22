import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  Student = 'student',
  Owner = 'owner',
  Admin = 'admin',
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(UserRole), required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
