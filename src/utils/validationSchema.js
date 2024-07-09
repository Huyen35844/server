import { isValidObjectId } from "mongoose";
import * as yup from "yup"
import categories from "./categories.js";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex =
    /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[a-zA-Z\d!@#\$%\^&\*]+$/;


//We can simply use method matches but this is how we can custom the method
//hover on addMethod will show suggestions, message is built-in property(one of the options)
//to show the error, message is a param which will be passed when call fun email("this is the message")
yup.addMethod(yup.string, "email", function validateEmail(message) {
    return this.matches(emailRegex, {
        message,
        name: "email",
        //skip checking email regex if the data is an empty string
        excludeEmptyString: true
    })
})


//separate each property for reuse purposes
const password = {
    password: yup
        .string()
        .required("Password is missing!")
        .min(8, "Password should be at least 8 chars long!")
        .matches(passwordRegex, "Password is too simple!")
}

const email = {
    email: yup
        .string()
        .required("Email is missing!")
        .email("Invalid email!")
}

const name = {
    name: yup.string().required("Name is missing!")
}

const token = {
    token: yup.string().required("Token is missing!")
}

const id = {
    id: yup
        .string()
        .test({
            name: "valid-id",
            message: "Invalid user id",
            test: (value) => {
                return isValidObjectId(value)
            }
        })
}

export const newUserSchema = yup.object({
    ...name,
    ...email,
    ...password
})


export const verifyTokenSchema = yup.object({
    ...id,
    ...token
})

export const resetPasswordSchema = yup.object({
    ...id,
    ...token,
    ...password
})

export const productSchema = yup.object({
    name: yup.string().required("Name is missing!"),
    description: yup.string().required("Description is missing!"),
    category: yup.string().oneOf(categories, "Invalid category!").required("Category is missing!"),
    price: yup.string().transform((value) => {
        if (isNaN(+value)) return "";
        return +value
    }).required("Price is missing!"),
    purchasingDate: yup.string().transform((value) => {
        try {
            return parseISO(value)
        } catch (error) {
            return ""
        }
    })
        .required("Purchasing date is missing!")
})