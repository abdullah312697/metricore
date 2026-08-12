import express from 'express';
const router = express.Router();
import { uploadImage } from '../cloudinary.js';
import multerProcess from '../multerMiddleware.js';
import ClientProduct from "../models/ClientProduct.js";
import{decryptUserData} from '../verifyuser.js';
import { deleteResorce } from '../cloudinaryDelete.js';
import {generatePublicId} from '../reuseableFn.js';
import { limitFor } from "../config/plans.js";
import Companies from '../models/Companies.js'


router.post("/addNewProduct", async (req, res) => {
  const { employeeId, companyId} = req.cookies;

  const newemplyeeId = decryptUserData(employeeId);
  const newcompanyId = decryptUserData(companyId);

  multerProcess(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!newemplyeeId || !newcompanyId) {
        return res.status(400).json({ message: "Login/Register please!" });
      }

      const billing = await Companies.findById(newcompanyId).select("planId subscriptionStatus trialEndsAt").lean();
      const max = limitFor(billing, "products");
      if (max !== Infinity) {
        const n = await ClientProduct.countDocuments({ companyId: newcompanyId });
        if (n >= max) return res.status(403).json({ message: `Your plan allows up to ${max} Products. Upgrade to add more.` });
      }

      const fname = "ProductImage";
      const file = req.files[0];
      const productData = req.body;
      let goalIds = productData.GoalIdentifire || [];
      if (typeof goalIds === "string") {
          goalIds = goalIds.split(",").map(id => id.trim());
      } else if (!Array.isArray(goalIds)) {
          goalIds = [goalIds];
      }
      // ✅ Validate required fields
      const requiredFields = ["ProductName", "ProductPrice", "InStockQuentity"];
      for (const field of requiredFields) {
        const value = productData[field];
        if (!value || value.trim() === "") {
          return res.status(400).json({ message: `Field "${field}" must not be empty` });
        }
      }

      // ✅ Handle image upload
      const imageStream = file.buffer;
      const originalName = file.originalname;

      let publicId = generatePublicId(originalName);

      const uploadResult = await uploadImage(imageStream, publicId, fname);

      // ✅ Create product document
// ✅ Create product document — explicit fields only (no mass-assignment)
      const newProduct = await ClientProduct.create({
        companyId:          newcompanyId,      // from the COOKIE, never the body
        ProductName:        productData.ProductName.trim(),
        sku:                productData.sku?.trim() || undefined,   // 👈 SKU saved
        ProductPrice:       productData.ProductPrice,
        InStockQuentity:    productData.InStockQuentity,
        GoalIdentifire:     goalIds,
        productImgFile:     uploadResult.secure_url,
        CloudinaryPublicId: uploadResult.public_id,
      });
      return res.status(200).json({
        message: "New product added successfully!",
        data: newProduct
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});

router.get("/getallProducts", async (req, res) => {
  try {
  const { employeeId, companyId} = req.cookies;

  const newemplyeeId = decryptUserData(employeeId);
  const newcompanyId = decryptUserData(companyId);

    if (!newemplyeeId || !newcompanyId) {
      return res.status(400).json({ message: "Login/Register please!" });
    }
    // 🔍 Find all products for this company
    const products = await ClientProduct.find({ companyId : newcompanyId }).sort({ createdAt: -1 });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found!" });
    }

    return res.status(200).json({
      message: "Products fetched successfully!",
      data: products,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

router.get("/getSingleProduct/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
  const { employeeId, companyId} = req.cookies;

  const newemplyeeId = decryptUserData(employeeId);
  const newcompanyId = decryptUserData(companyId);

    if (!newemplyeeId || !newcompanyId) {
      return res.status(400).json({ message: "Login/Register please!" });
    }

    // 🔍 Find the product that matches both productId and companyId
    const product = await ClientProduct.findOne({ _id: productId, companyId : newcompanyId });

    if (!product) {
      return res.status(200).json({ message: "Product not found!", data:[] });
    }

    return res.status(200).json({
      message: "Product fetched successfully!",
      data: product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});


router.put("/updateProduct/:productId", async (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const { employeeId, companyId} = req.cookies;
      const newemplyeeId = decryptUserData(employeeId);
      const newcompanyId = decryptUserData(companyId);
      if (!newemplyeeId || !newcompanyId) return res.status(401).json({ message: "Login/Register please!" });

      const { productId } = req.params;
      const file = req.files?.[0];

      const ALLOWED = ["ProductName", "sku", "ProductPrice", "InStockQuentity", "GoalIdentifire"];
      const filtered = {};
      for (const [key, val] of Object.entries(req.body || {})) {
        if (!ALLOWED.includes(key) && key !== "GoalIdentifire[]") continue;   // 👈 drop everything else
        if (val !== "" && val !== null && val !== undefined) filtered[key] = val;
      }

      // ✅ Normalize GoalIdentifire into a proper array
      if (filtered.GoalIdentifire || filtered["GoalIdentifire[]"]) {
        let rawIds = filtered["GoalIdentifire[]"] || filtered.GoalIdentifire;

        if (typeof rawIds === "string") {
          // Came as comma-separated string — split it
          rawIds = rawIds.split(",").map(id => id.trim());
        } else if (!Array.isArray(rawIds)) {
          rawIds = [rawIds];
        }

        filtered.GoalIdentifire = rawIds;
        // Clean up bracket key if present
        delete filtered["GoalIdentifire[]"];
      }

      // ✅ Handle image upload only if file exists
      if (file) {
        const imageStream = file.buffer;
        const originalName = file.originalname;
        let publicId = generatePublicId(originalName);

        const uploadResult = await uploadImage(
          imageStream,
          publicId,
          "ProductImage",
        );
        if (!uploadResult?.secure_url) {
          return res.status(500).json({ message: "Image upload failed" });
        }
        filtered.productImgFile = uploadResult.secure_url;
        filtered.CloudinaryPublicId = uploadResult.public_id;
      }

      // ✅ Find existing product by ID and company ownership
      const existingProduct = await ClientProduct.findOne({
        _id: productId,
        companyId: newcompanyId,
      });

      if (!existingProduct)
        return res.status(404).json({ message: "Product not found or unauthorized" });

      // ✅ Delete old Cloudinary image if replaced
      if (filtered.CloudinaryPublicId && existingProduct.CloudinaryPublicId) {
        try {
          await deleteResorce(existingProduct.CloudinaryPublicId, "image").catch(() => {});
        } catch (delErr) {
          console.warn("Failed to delete old image:", delErr);
        }
      }

      // ✅ Update and save
      Object.assign(existingProduct, filtered);
     const updatedProduct = await existingProduct.save();

      return res.status(200).json({
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("updateProduct error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});

router.put("/changeProductImage/:productId", async (req, res) => {
  multerProcess(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { employeeId, companyId} = req.cookies;
      const newemplyeeId = decryptUserData(employeeId);
      const newcompanyId = decryptUserData(companyId);
      const { productId } = req.params;
      
        if (!newemplyeeId || !newcompanyId) return res.status(401).json({ message: "Login/Register please!" });
      const file = req.files[0];

      // Ensure file exists
      if (!file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const imageStream = file.buffer;
      const originalName = file.originalname;

      let publicId = generatePublicId(originalName);

      // Upload new image
      const uploadResult = await uploadImage(
        imageStream,
        publicId,
        "ProductImage"
      );

      if (!uploadResult?.secure_url) {
        return res.status(500).json({ message: "Image upload failed" });
      }

      // Find the product belonging to this company
      const product = await ClientProduct.findOne({ _id: productId, companyId : newcompanyId });
      if (!product) {
        // If product not found, delete the newly uploaded image to avoid orphaned files
        await deleteResorce(uploadResult.public_id, "image").catch(() => {});
        return res.status(404).json({ message: "Product not found" });
      }

      // Delete old image from Cloudinary (if exists)
      if (product.CloudinaryPublicId) {
        await deleteResorce(product.CloudinaryPublicId, "image").catch(() => {});
      }

      // Update product with new image details
      product.productImgFile = uploadResult.secure_url;
      product.CloudinaryPublicId = uploadResult.public_id;
      product.updatedAt = Date.now();
      await product.save();

      return res.status(200).json({
        message: "Product image updated successfully!",
        data: product,
      });
    } catch (error) {
      console.error("changeProductImage error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  });
});

router.delete("/deleteProduct/:productId", async (req, res) => {
  try {
      const { employeeId, companyId} = req.cookies;
      const newemplyeeId = decryptUserData(employeeId);
      const newcompanyId = decryptUserData(companyId);

    if (!newemplyeeId || !newcompanyId) {
      return res.status(401).json({ message: "Login/Register please!" });
    }
        const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find product belonging to this company
    const product = await ClientProduct.findOne({ _id: productId, companyId : newcompanyId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete Cloudinary image (if any)
    if (product.CloudinaryPublicId) {
      await deleteResorce(product.CloudinaryPublicId, "image").catch(() => {});
    }

    // Delete product document from collection
    await ClientProduct.deleteOne({ _id: productId, companyId : newcompanyId });

    return res.status(200).json({
      message: "Product deleted successfully!",
    });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;