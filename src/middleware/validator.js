import * as yup from 'yup'
import { sendErrorRes } from '../utils/sendErrorRes.js';

const validate = (schema) => {
    return async (req, res, next) => {
        //set abortEarly as true, yup catchs the error not in order
        //set abortEarly as false, yup catchs all the error at once (5 errors occurs)
        //set inner[0] to only get the first error yup catch to solve this problem
        try {
            await schema.validate(
                { ...req.body },
                //strict (true) means: schema (age, name) but data (age, name, hobby) => fine
                //abortEarly (true): return at once when an error occurs
                { strict: true, abortEarly: true }
            );
            next();
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                return sendErrorRes(res, error.message, 400)
            } else {
                next(error)
            }
        }
    }
}
export default validate