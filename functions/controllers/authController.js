const authService = require('../services/authService')
const asyncErrorHandler = require('../utils/asyncErrorHandler')

const authController = {
    signUp : asyncErrorHandler(async (req, res, next) => {
        await authService.signUp(req.body)

        res.status(201).json({})
    })
}

module.exports = authController