import nodemailer from 'nodemailer'

var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: process.env.MAIL_TRAP_USER,
        pass: process.env.MAIL_TRAP_PASS,
    }
});

const sendVerificationLink = async (email, link) => {
    transport.sendMail({
        from: "landgreen818@gmail.com",
        to: email,
        html: `<h1>Please click on <a href="${link}"> this link</a> to verify your account.</h1>`
    })
}

const sendPasswordResetLink = async (email, link) => {
    transport.sendMail({
        from: "landgreen818@gmail.com",
        to: email,
        html: `<h1>Please click on <a href="${link}"> this link</a> to reset your password</h1>`
    })
}

const sendPasswordUpdateMessage = async (email) => {
    transport.sendMail({
        from: "landgreen818@gmail.com",
        to: email,
        html: `<h1>Your password is updated, you can now use your new password</h1>`
    })
}

const mail = { sendVerificationLink, sendPasswordResetLink, sendPasswordUpdateMessage }

export default mail