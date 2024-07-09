import { compare, genSalt, hash } from "bcrypt";
import { Schema, model } from "mongoose";

const schema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    createdAt: {
        type: Date,
        expires: 86400, //60 seconds * 60 minutes * 24 hours,
        default: Date.now()
    },
})

schema.pre('save', async function (next) {
    if (this.isModified('token')) {
        const salt = await genSalt(10)
        this.token = await hash(this.token, salt)
    }
    next()
})

schema.methods.compareToken = async function (token) {
    return await compare(token, this.token)
}

const AuthVerificationTokenModel = model('AuthVerificationToken', schema);
export default AuthVerificationTokenModel