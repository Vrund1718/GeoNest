import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IImage extends Document {
  pgId: Types.ObjectId;
  url: string;
  cloudinaryPublicId: string;
  isPrimary: boolean;
  uploadedBy: Types.ObjectId;
  width?: number;
  height?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema: Schema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    url: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    width: { type: Number },
    height: { type: Number },
  },
  { timestamps: true }
);

ImageSchema.index({ pgId: 1, isPrimary: 1 });

export default mongoose.model<IImage>('Image', ImageSchema);
