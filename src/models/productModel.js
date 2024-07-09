import { Schema, model } from "mongoose";
import categories from "../utils/categories.js";

const schema = Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: String, required: true },
    category: {
        type: String,
        enum: [...categories],
        required: true,
    },
    purchasingDate: {
        type: Date,
        required: true,
    },
    images: [
        {
            type: Object,
            url: String,
            id: String,
        },
    ],
    thumbnail: String,
}, { timestamps: true })

const ProductModel = model("Product", schema)
export default ProductModel