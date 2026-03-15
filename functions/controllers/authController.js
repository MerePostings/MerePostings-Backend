const { disableNetwork } = require('firebase/firestore')
const authService = require('../services/authService')
const asyncErrorHandler = require('../utils/asyncErrorHandler')

const authController = {
    signUp : asyncErrorHandler(async (req, res) => {
        await authService.signUp(req.body)

        res.status(201).json({ msg: "User signed up successfully!" })
    }),
    
    getUserById: asyncErrorHandler(async (req, res) => {
        const { id } = req.params;
        const result = await authService.getUserById(id);
        if (result.message) {
        res.status(404).json({ msg: result.message });
        } else {
            res.status(200).json({
                user: result,
            });
        }
    }),

}

module.exports = authController