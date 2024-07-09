import { Router } from "express";
import { isAuth } from "../middleware/auth.js";
import fileParser from "../middleware/fileParser.js";
import validate from "../middleware/validator.js";
import { productSchema } from "../utils/validationSchema.js";
import { addNewProduct, deleteProduct, deleteProductImage, getLatestProducts, getProductByCategory, getProductDetail, getProducts, updateProduct } from "../controllers/product.js";

const productRouter = Router();

// Create a new product with availble data in req.body. 
// Read file from req.files and check whether there are mutiple files or not
// Only allow <= 5 images
// Check the file type using mimetype
// Upload file and attach the properties image, thumbnail for created product
productRouter.post("/add-new-product", isAuth, fileParser, validate(productSchema), addNewProduct)

// Read the id from param and check isValidOjectId or not
// Find product and update with id and req.user.id, the data use for updating from req.body
// Read file from req.files and check whether there are mutiple files or not
// Only allow <= 5 images (newfile + oldfile <= 5)
// Check the file type using mimetype
// Upload file and attach the properties image, thumbnail to the found product
productRouter.post("/update-product/:id", isAuth, fileParser, validate(productSchema), updateProduct)


// Read the id from param and check isValidOjectId or not
// Find product and delete with id and req.user.id
// Delete images of product on cloudinary
productRouter.delete("/delete-product/:id", isAuth, deleteProduct)

// Read the productId, imageId from param and check whether productId isValidOjectId or not
// Find product to validate for two cases "product not found" and "image not found"
// Update product
// If thumbnail is the deleted image, update the new thumbnail
productRouter.delete("/delete-product-image/:productId/:imageId", isAuth, deleteProductImage)

// Read the id and check whether productId isValidOjectId or not
// Get data including product's info and seller's info by using findById and populate
productRouter.get("/get-product-detail/:id", getProductDetail)


// Read category from params and check category by includes method
// Read limit and page from req.query
// Find products by category and sort by createdAt, skip and limit
productRouter.get("/get-product-by-category/:category", getProductByCategory)

// Read limit and page from req.query
// Find nothing and sort by createdAt, skip and limit
productRouter.get("/latest", getLatestProducts)


// Read limit and page from req.query
// Find products with its owner and sort by createdAt, skip and limit
// Return product's info and seller's info
productRouter.get("/get-products", isAuth, getProducts)
export default productRouter;