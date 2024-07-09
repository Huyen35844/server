export const sendErrorRes = (res, message, statusCode) => {
    res.status(statusCode).json({ message })
}