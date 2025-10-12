const { disableNetwork } = require('firebase/firestore')
const authService = require('../services/authService')
const asyncErrorHandler = require('../utils/asyncErrorHandler')

const authController = {
    signUp : asyncErrorHandler(async (req, res, next) => {
        await authService.signUp(req.body)

        res.status(201).json({ msg: "User signed up successfully!" })
    }),
}

module.exports = authController