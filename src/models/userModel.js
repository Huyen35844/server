import { compare, genSalt, hash } from "bcrypt";
import { Schema, model } from "mongoose";
const userSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        password: { type: String, unique: true, required: true },
        verified: { type: Boolean, default: false },
        tokens: [{ type: String }],
        avatar: {
            url: { type: String },
            id: { type: String }
        }
    },
    //save the time when the data is changed or created,...
    { timestamps: true }
)


//Before saving (pre), check whether password is changed or not
//if it was changed, we would hash it to be secure
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        const salt = await genSalt(10);
        this.password = await hash(this.password, salt)
    }
    next();
})

userSchema.methods.comparePassword = async function (password) {
    return await compare(password, this.password);
}

const UserModel = model("User", userSchema)
export default UserModel;