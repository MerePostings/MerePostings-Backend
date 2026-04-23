const userService = require('../services/userService')
const asyncErrorHandler = require('../utils/asyncErrorHandler');

const userController = {
    updateUserProfile : asyncErrorHandler( async (req, res) => {
        const { firstName, lastName } = req.body;
        await userService.updateUserProfile(req.user.uid, firstName,lastName);
        res.status(200).json({});
    }),

    getUserById: asyncErrorHandler(async (req, res) => {
        const result = await userService.getUserById(req.user.uid);
        res.status(200).json({ user: result });
    }),

    getUserTransactions: asyncErrorHandler(async (req, res) => {
        const transactions = await userService.getUserTransactions(req.user.uid);
        res.status(200).json({ transactions });
    })
}

module.exports = userController