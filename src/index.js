import 'dotenv/config'
import express from 'express'
import productRouter from './routes/product.js';
import authRouter from './routes/auth.js';
import "express-async-errors"
import './db/index.js'
import cors from 'cors'


const app = express()
app.use(express.static("src/public"))
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.use(cors());

//API Routes
app.use("/auth", authRouter)
app.use("/product", productRouter)

//catch the error if something wrong in endpoint files to avoid repeating try catch block (express-async-error)
app.use(function (err, req, res, next) {
    res.status(500).json({ message: err.message })
})

app.listen(8000, () => {
    console.log('The app is running on http://localhost:8000');
})