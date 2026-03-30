const { db } = require("../config/db");
const AppError = require("../utils/AppError")

const userService = {
    updateUserProfile: async (id, firstName, lastName) => {
        try {
            const docRef = db.collection("users").doc(id);
            const data = {};
            if (firstName !== undefined && firstName !== null)
                data.firstName = firstName;
            if (lastName !== undefined && lastName !== null) data.lastName = lastName;
            if (Object.keys(data).length > 0) {
                await docRef.set(data, { merge: true });
            }
        } catch (err) {
            throw new AppError(
                "Error in updating user details. Please try again!",
                400
            );
        }
    },

    getUserById: async (id) => {
        try {
            const docRef = db.collection("users").doc(id);
            const docSnap = await docRef.get();

            const user = {
                firstName: docSnap.data().firstName,
                lastName: docSnap.data().lastName,
                email: docSnap.data().email,
            };

            return user;
        } catch (err) {
            throw new AppError("User Not Found!", 400);
        }
    },
}

module.exports = userService