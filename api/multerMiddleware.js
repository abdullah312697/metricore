import multer from "multer";

const storage = multer.memoryStorage();

const multerMiddleware = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 25MB for video/audio
  fileFilter: (req, file, cb) => {

const allowedMimeTypes = [
  // ── Images ──────────────────────────────────────────────
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/tiff",
  "image/jpg",

  // ── Videos ──────────────────────────────────────────────
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",            // .avi

  // ── Audio ───────────────────────────────────────────────
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",                  // iPhone Safari

  // ── Plain Text ──────────────────────────────────────────
  "text/plain",                 // .txt
  "text/csv",                   // .csv
  "text/html",                  // .html
  "text/xml",                   // .xml
  "application/json",           // .json
  "application/xml",            // .xml (alternative MIME)

  // ── Archive / Compressed ────────────────────────────────
  "application/zip",                          // .zip
  "application/x-zip-compressed",            // .zip (Windows variant)
  "application/x-rar-compressed",            // .rar
  "application/vnd.rar",                     // .rar (modern)
  "application/x-7z-compressed",            // .7z
  "application/gzip",                        // .gz
  "application/x-tar",                       // .tar

  // ── Microsoft Office ────────────────────────────────────
  "application/pdf",
  "application/msword",                                                        // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // .docx
  "application/vnd.ms-excel",                                                 // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        // .xlsx
  "application/vnd.ms-powerpoint",                                            // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",// .pptx

  // ── OpenDocument (LibreOffice / Google export) ───────────
  "application/vnd.oasis.opendocument.text",         // .odt
  "application/vnd.oasis.opendocument.spreadsheet",  // .ods
  "application/vnd.oasis.opendocument.presentation", // .odp

  // ── Other Business Essentials ───────────────────────────
  "application/vnd.ms-outlook",             // .msg  — Outlook email export
  "message/rfc822",                         // .eml  — standard email file
  "application/rtf",                        // .rtf  — rich text (cross-app)
  "application/x-iwork-pages-sffpages",    // .pages — Apple Pages
  "application/x-iwork-numbers-sffnumbers",// .numbers — Apple Numbers
  "application/x-iwork-keynote-sffkey",    // .key  — Apple Keynote
];

if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }

    cb(null, true);
  }
});

/*
IMPORTANT:
use array for multiple files
field name must match frontend FormData.append("files")
*/
const multerProcess = multerMiddleware.array("files", 10);

export default multerProcess;