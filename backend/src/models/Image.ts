import mongoose, { Document, Schema } from 'mongoose';

export interface IImage extends Document {
  pgId: mongoose.Types.ObjectId;
  url: string;
  isPrimary: boolean;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema: Schema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    url: { type: String, required: true },
    isPrimary: { type: Boolean, required: true, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IImage>('Image', ImageSchema);
