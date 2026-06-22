import "./styles.css";
import { toast } from "react-toastify";
import { allowedImageMimeTypes, ImageUpload, readImageUpload } from "../../../utils/image-upload";

type ImageUploadFieldProps = {
  label: string;
  imageUrl?: string;
  pendingUpload?: boolean;
  onChange: (imageUrl: string, imageUpload: ImageUpload) => void;
};

export function ImageUploadField({ label, imageUrl, pendingUpload = false, onChange }: ImageUploadFieldProps) {
  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;

    if (!allowedImageMimeTypes.includes(file.type as (typeof allowedImageMimeTypes)[number])) {
      toast.warning("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("A imagem deve ter ate 5MB.");
      return;
    }

    try {
      const imageUpload = await readImageUpload(file);
      onChange(URL.createObjectURL(file), imageUpload);
      toast.info("Imagem selecionada para envio.");
    } catch {
      toast.error("Nao foi possivel ler a imagem.");
    }
  };

  return (
    <div className="image-upload-field">
      <label className="field">
        <span>{label}</span>
        <div>
          <input accept={allowedImageMimeTypes.join(",")} onChange={(event) => void handleFileChange(event.target.files?.[0])} type="file" />
        </div>
      </label>

      {imageUrl ? (
        <div className="product-image-preview">
          <img src={imageUrl} alt="Previa do produto" />
          <span>{pendingUpload ? "Imagem pronta para upload" : "Imagem atual do produto"}</span>
        </div>
      ) : null}
    </div>
  );
}
