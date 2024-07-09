import { isValidObjectId } from "mongoose"
import ProductModel from "../models/productModel.js"
import { sendErrorRes } from "../utils/sendErrorRes.js"
import cloudUploader, { cloudApi } from "../cloud/index.js"
import categories from "../utils/categories.js"


const uploadImage = (filePath) => {
    return cloudUploader.upload(filePath, {
        width: 1280,
        height: 720,
        crop: "fill"
    })
}
export const addNewProduct = async (req, res) => {
    const { name, description, price, category, purchasingDate } = req.body
    const newProduct = new ProductModel({
        owner: req.user.id,
        name,
        price,
        description,
        category,
        purchasingDate
    })

    const { images } = req.files

    const isMutilpleImages = Array.isArray(images);

    if (isMutilpleImages && images.length > 5) {
        return sendErrorRes(res, "Image files can not be more than 5!")
    }

    let invalidFileType = false;

    //check whether any file has the wrong type, not starsWith image
    if (isMutilpleImages) {
        for (let img of images) {
            if (!img.mimetype.startsWith("image")) {
                invalidFileType = true;
                break;
            }
        }
    } else {
        if (images) {
            if (!images.mimetype.startsWith("image")) {
                invalidFileType = true;
            }
        }
    }

    if (invalidFileType) {
        return sendErrorRes(res, "Invalid file type, files must be image type!", 400)
    }

    //file upload
    if (isMutilpleImages) {
        const uploadPromise = images.map((file) => uploadImage(file.filepath))
        // Wait for all file uploads to complete
        const uploadResults = await Promise.all(uploadPromise)
        // Add the image URLs and public IDs to the product's images field
        newProduct.images = uploadResults.map(({ secure_url, public_id }) => {
            return { url: secure_url, id: public_id }
        })

        newProduct.thumbnail = newProduct.images[0].url
    } else {
        if (images) {
            const { secure_url, public_id } = await uploadImage(images.filepath);
            newProduct.images = [{ url: secure_url, id: public_id }],
                newProduct.thumbnail = secure_url
        }
    }

    await newProduct.save()

    res.status(200).json({ message: "Added new product!" })
}


export const updateProduct = async (req, res) => {
    const { name, description, price, category, purchasingDate } = req.body
    //if we use {}, we only write req.params
    const productId = req.params.id
    if (!isValidObjectId(productId)) return sendErrorRes(res, "Invalid product id!", 400)

    const product = await ProductModel.findOneAndUpdate(
        { _id: productId, owner: req.user.id },
        {
            name,
            price,
            category,
            description,
            purchasingDate
        },
        //This option tells Mongoose to return the updated document instead of the original document. By default, findOneAndUpdate returns the original document before the update was applied. 
        { new: true }
    )

    if (!product) return sendErrorRes(res, "Product not found!", 400)

    const { images } = req.files
    const isMutilpleImages = Array.isArray(images)
    console.log(images);

    //Check the quantity of images
    if (isMutilpleImages) {
        const oldImages = product.images.length || 0
        if (oldImages + images.length > 5) {
            return sendErrorRes(res, "Images file can not be more than 5!", 400)
        }
    }

    //Check the file type
    let invalidFileType = false
    if (isMutilpleImages) {
        for (let img of images) {
            if (!img.mimetype.startsWith("image")) {
                invalidFileType = true;
                break;
            }
        }
    } else {
        if (images) {
            if (!images.mimetype.startsWith("image")) {
                invalidFileType = true;
            }
        }
    }

    if (invalidFileType) sendErrorRes(res, "Invalid file type, files must be image type!", 400)


    //file upload
    if (isMutilpleImages) {
        const uploadPromise = images.map((file) => uploadImage(file.filepath))
        const uploadResult = await Promise.all(uploadPromise)
        const newImages = uploadResult.map(({ secure_url, public_id }) => { return { url: secure_url, id: public_id } })
        if (product.images) {
            product.images.push(...newImages)
        }
        else product.images = newImages

        product.thumbnail = product.images[0].url
    } else {
        const { secure_url, public_id } = await uploadImage(images.filepath)
        if (product.images)
            product.images.push({ url: secure_url, id: public_id })
        else product.images = [{ url: secure_url, id: public_id }]

        product.thumbnail = product.images[0].url

    }

    await product.save()

    res.status(200).json({
        message: "Product updated successfully!"
    })

}

export const deleteProduct = async (req, res) => {
    const productId = req.params.id
    if (!isValidObjectId(productId)) return sendErrorRes(res, "Invalid product id!", 400)

    const product = await ProductModel.findOneAndDelete(
        { _id: productId, owner: req.user.id }
    )

    if (!product) return sendErrorRes(res, "Product not found", 400)
    const images = product.images || []
    if (images.length) {
        const ids = images.map(({ id }) => id)
        await cloudApi.delete_resources(ids)
    }

    res.json({ message: "Product removed successfully!" })

}

export const deleteProductImage = async (req, res) => {
    const { productId, imageId } = req.params
    if (!isValidObjectId(productId)) return sendErrorRes(res, "Invalid product id", 400)

    const product = await ProductModel.findOne(
        { _id: productId, owner: req.user.id },
    )

    if (!product) return sendErrorRes(res, "Product not found!", 400)

    const image = product.images.find(({ id }) => id == imageId)
    if (!image) return sendErrorRes(res, "Image not found", 400)


    const updatedProduct = await ProductModel.findOneAndUpdate(
        { _id: productId, owner: req.user.id },
        {
            $pull: {
                images: { id: imageId }
            }
        },
        { new: true }
    )

    //In the case of thumbnail is the deleted image
    const deletedImageURL = updatedProduct.images.find(({ id, url }) => { if (id == imageId) { return url } })
    if (updatedProduct.thumbnail.includes(deletedImageURL)) {
        const images = updatedProduct.images || []
        if (images.length > 0) updatedProduct.thumbnail = images[0].url
        else updatedProduct.thumbnail = ''
        await updatedProduct.save()
    }

    await cloudUploader.destroy(imageId)
    res.json({ message: "Image removed successfully!" })
}


export const getProductDetail = async (req, res) => {
    const id = req.params.id
    if (!isValidObjectId(id)) return sendErrorRes(res, "Invalid product id!", 400)

    //Using populate to get the data in User table by the porperty owner
    const product = await ProductModel.findById(id).populate("owner")

    if (!product) return sendErrorRes(res, "Product not found!", 400)

    res.json({
        product: {
            id: product._id,
            name: product.name,
            description: product.description,
            thumbnail: product.thumbnail,
            category: product.category,
            date: product.purchasingDate,
            price: product.price,
            image: product.images?.map(({ url }) => url),
            seller: {
                id: product.owner._id,
                name: product.owner.name,
                avatar: product.owner.avatar?.url,
            },
        },
    })
}

export const getProductByCategory = async (req, res) => {
    const category = req.params.category
    const { page = "1", limit = "10" } = req.query

    if (!categories.includes(category)) return sendErrorRes(res, "Invalid category!", 400)

    const products = await ProductModel.find({ category }).sort("-createdAt").skip((+page - 1) * limit).limit(+limit)

    const list = products.map((p) => {
        return {
            id: p._id,
            name: p.name,
            thumbnail: p.thumbnail,
            category: p.category,
            price: p.price,
            description: p.description
        }
    })

    res.json({ products: list })
}

export const getLatestProducts = async (req, res) => {
    const { limit = "10", page = "1" } = req.query
    const products = await ProductModel.find().sort("-createdAt").skip((+page - 1) * +limit).limit(+limit)
    const list = products.map((p) => {
        return {
            id: p._id,
            name: p.name,
            thumbnail: p.thumbnail,
            category: p.category,
            price: p.price,
            description: p.description
        }
    })

    res.json({ products: list })
}

export const getProducts = async (req, res) => {
    const { limit = "10", page = "1" } = req.query
    const products = await ProductModel.find({ owner: req.user.id }).sort("-createdAt").skip((+page - 1) * +limit).limit(+limit)
    const list = products.map((p) => {
        return {
            id: p._id,
            name: p.name,
            thumbnail: p.thumbnail,
            category: p.category,
            price: p.price,
            image: p.images?.map((i) => i.url),
            date: p.purchasingDate,
            description: p.description,
            seller: {
                id: req.user.id,
                name: req.user.name,
                avatar: req.user.avatar,
            },
        };
    })

    res.json({ products: list })

}

