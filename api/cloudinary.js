import { v2 as cloudinary } from "cloudinary";
import { PassThrough } from "stream";

cloudinary.config({ secure: true });

export const uploadImage = async (fileStream, public_id, fname, onProgress) => {
  return await uploadStream(fileStream, public_id, fname, onProgress);
};

const uploadStream = (fileStream, publicId, fname, onProgress) => {
  const folderName = `flucash/${fname}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        public_id: publicId,
        resource_type: "auto",
        use_filename: false,
        unique_filename: false,
        type: "upload",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    if (!onProgress || !Buffer.isBuffer(fileStream)) {
      stream.end(fileStream);
      return;
    }

    const total = fileStream.length;
    let uploaded = 0;
    const pass = new PassThrough();

    pass.on("data", (chunk) => {
      uploaded += chunk.length;
      const percent = Math.round((uploaded / total) * 100);
      onProgress(Math.min(percent, 99));
    });

    pass.on("error", reject);
    pass.pipe(stream);
    pass.end(fileStream);
  });
};