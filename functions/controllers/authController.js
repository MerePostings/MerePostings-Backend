const { disableNetwork } = require('firebase/firestore')
const authService = require('../services/authService')
const asyncErrorHandler = require('../utils/asyncErrorHandler')

const authController = {
    signUp : asyncErrorHandler(async (req, res, next) => {
        await authService.signUp(req.body)

        res.status(201).json({})
    }),

    ifUserVerified : asyncErrorHandler(async (req, res, next) => {
        const response = await authService.ifUserVerified(req.body)

        res.status(200).json({
            exists: response.exists,
            emailVerified: response.emailVerified,
            phoneVerified: response.phoneVerified,
            disabled: response.disabled
        })
    })
}

module.exports = authController