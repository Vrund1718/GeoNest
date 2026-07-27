import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  UploadCloud,
  X,
  Star,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';

export interface UploadedImage {
  id: string;
  file?: File;
  url?: string;
  previewUrl: string;
  progress: number;
  error?: string;
  isPrimary: boolean;
}

export type UploadHandler = (
  files: File[],
  progressCb: (fileIndex: number, pct: number) => void
) => Promise<Array<{ id: string; url: string; isPrimary?: boolean }>>;

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
  onUpload?: UploadHandler;
  onRemovePersisted?: (image: UploadedImage) => Promise<void> | void;
  onPrimaryChangePersisted?: (image: UploadedImage) => Promise<void> | void;
}

const generateId = (() => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return () => crypto.randomUUID();
  }
  return () => Math.random().toString(36).slice(2, 10);
})();

const simulateUpload = (onProgress: (p: number) => void): Promise<void> =>
  new Promise((resolve) => {
    let p = 0;
    const interval = window.setInterval(() => {
      p += Math.random() * 30 + 10;
      if (p >= 100) {
        p = 100;
        onProgress(p);
        window.clearInterval(interval);
        resolve();
      } else {
        onProgress(Math.round(p));
      }
    }, 200);
  });

export const ImageUploader = ({
  images,
  onChange,
  maxFiles = 8,
  accept = 'image/png,image/jpeg,image/webp',
  className = '',
  onUpload,
  onRemovePersisted,
  onPrimaryChangePersisted,
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const slotsLeft = maxFiles - images.length;
      if (slotsLeft <= 0) return;
      const toAdd = files.slice(0, slotsLeft).filter((f) => f.type.startsWith('image/'));
      if (toAdd.length === 0) return;

      const noPrimaryYet = images.every((im) => im.isPrimary === false);

      const initial: UploadedImage[] = toAdd.map((file, i) => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        isPrimary: noPrimaryYet && i === 0,
      }));

      let newImages = [...images, ...initial];
      onChange(newImages);

      if (onUpload) {
        try {
          const results = await onUpload(toAdd, (idx, pct) => {
            const entryId = initial[idx]?.id;
            if (!entryId) return;
            newImages = newImages.map((im) =>
              im.id === entryId ? { ...im, progress: pct } : im
            );
            onChange(newImages);
          });
          newImages = newImages.map((im) => {
            const matchIdx = initial.findIndex((x) => x.id === im.id);
            if (matchIdx === -1) return im;
            const res = results[matchIdx];
            if (!res) return im;
            return {
              ...im,
              id: res.id,
              url: res.url,
              file: undefined,
              progress: 100,
              isPrimary: res.isPrimary ?? im.isPrimary,
            };
          });
          onChange(newImages);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Upload failed';
          newImages = newImages.map((im) => {
            if (!initial.some((x) => x.id === im.id)) return im;
            return { ...im, error: msg, progress: 0 };
          });
          onChange(newImages);
        }
      } else {
        initial.forEach((entry) => {
          simulateUpload((progress) => {
            newImages = newImages.map((im) =>
              im.id === entry.id ? { ...im, progress } : im
            );
            onChange(newImages);
          });
        });
      }
    },
    [images, maxFiles, onChange, onUpload]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      void addFiles(e.dataTransfer.files);
    }
  };

  const removeImage = async (id: string) => {
    const target = images.find((im) => im.id === id);
    if (!target) return;
    const isPersisted = !target.file && !!target.url && !id.startsWith('local-');
    if (isPersisted && onRemovePersisted) {
      try {
        await onRemovePersisted(target);
      } catch (e) {
        console.warn('[ImageUploader] server-side delete failed, still removing from UI', e);
      }
    }
    if (target) URL.revokeObjectURL(target.previewUrl);
    const remaining = images.filter((im) => im.id !== id);
    const anyPrimary = remaining.some((im) => im.isPrimary);
    if (!anyPrimary && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    onChange(remaining);
  };

  const setPrimary = async (id: string) => {
    const target = images.find((im) => im.id === id);
    const isPersisted = target && !target.file && !!target.url && !id.startsWith('local-');
    if (isPersisted && onPrimaryChangePersisted) {
      try {
        await onPrimaryChangePersisted(target);
      } catch (e) {
        console.warn('[ImageUploader] server-side set-primary failed, still updating UI', e);
      }
    }
    onChange(
      images.map((im) => ({
        ...im,
        isPrimary: im.id === id,
      }))
    );
  };

  const slotsLeft = maxFiles - images.length;

  return (
    <div className={className}>
      <div
        onClick={() => slotsLeft > 0 && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (slotsLeft > 0) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role={slotsLeft > 0 ? 'button' : undefined}
        tabIndex={slotsLeft > 0 ? 0 : -1}
        aria-disabled={slotsLeft <= 0}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-150 ease-out motion-reduce:transition-none ${
          slotsLeft <= 0
            ? 'border-ink/10 bg-ink/5 opacity-60 cursor-not-allowed'
            : isDragging
            ? 'border-indigo bg-indigo/5 cursor-copy'
            : 'border-ink/20 bg-sand/50 cursor-pointer hover:border-indigo hover:bg-indigo/5'
        }`}
      >
        <UploadCloud
          size={40}
          className={`mx-auto mb-2 ${
            slotsLeft <= 0 ? 'text-ink/30' : 'text-indigo/60'
          }`}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-ink">
          {slotsLeft <= 0
            ? 'Maximum photos added'
            : isDragging
            ? 'Drop photos here'
            : 'Drag & drop photos, or click to browse'}
        </p>
        <p className="text-xs text-ink/50 mt-1">
          {slotsLeft > 0
            ? `You can upload up to ${slotsLeft} more photo${slotsLeft > 1 ? 's' : ''} (${accept
                .split(',')
                .map((s) => s.replace('image/', '.'))
                .join(', ')})`
            : `Remove a photo to add another (max ${maxFiles})`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          max={maxFiles}
          className="sr-only"
          onChange={handleChange}
          disabled={slotsLeft <= 0}
          aria-label="Upload images"
        />
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {images.map((im) => (
            <li
              key={im.id}
              className="relative group rounded-lg overflow-hidden border border-ink/10 aspect-square bg-sand"
            >
              <img
                src={im.previewUrl}
                alt={
                  im.file
                    ? `Uploaded photo: ${im.file.name}`
                    : 'PG listing photo'
                }
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 motion-reduce:transition-none" />

              <button
                type="button"
                onClick={() => setPrimary(im.id)}
                aria-pressed={im.isPrimary}
                aria-label={
                  im.isPrimary
                    ? 'This is the primary photo'
                    : 'Set as primary photo'
                }
                className={`absolute top-2 left-2 p-1.5 rounded-full shadow-md transition-all duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-marigold ${
                  im.isPrimary
                    ? 'bg-marigold text-ink'
                    : 'bg-white/90 text-ink/60 hover:text-marigold hover:bg-white'
                }`}
              >
                {im.isPrimary ? (
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                ) : (
                  <Star size={14} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => removeImage(im.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-ink/60 hover:text-coral hover:bg-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-coral"
                aria-label="Remove photo"
              >
                <X size={14} aria-hidden="true" />
              </button>

              {im.progress < 100 && !im.error && (
                <div className="absolute inset-x-0 bottom-0 px-2 pb-2 pt-4 bg-gradient-to-t from-ink/60 to-transparent">
                  <div className="flex items-center gap-2">
                    <progress
                      className="flex-1 h-1.5"
                      value={im.progress}
                      max={100}
                      aria-label={`Upload progress: ${im.progress}%`}
                    />
                    <span className="text-[10px] font-mono text-sand/90">
                      {im.progress}%
                    </span>
                  </div>
                </div>
              )}

              {im.error && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-coral/90 text-sand text-xs flex items-start gap-1.5">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{im.error}</span>
                </div>
              )}

              {im.isPrimary && im.progress === 100 && !im.error && (
                <span className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-marigold text-ink shadow">
                  Primary
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {images.length < 3 && (
        <p className="text-xs text-ink/50 mt-3 flex items-center gap-1.5">
          <ImageIcon size={14} aria-hidden="true" />
          Listings with 3+ photos get noticed first
        </p>
      )}
    </div>
  );
};
