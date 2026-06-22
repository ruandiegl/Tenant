export type ImageUpload = {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
};

export const allowedImageMimeTypes: ImageUpload["mimeType"][] = ["image/jpeg", "image/png", "image/webp"];

export function readImageUpload(file: File) {
  return new Promise<ImageUpload>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      const [, dataBase64 = ""] = result.split(",");

      resolve({
        fileName: file.name,
        mimeType: file.type as ImageUpload["mimeType"],
        dataBase64
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
