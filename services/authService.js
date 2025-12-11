const User = require('../models/User');
const Token = require('../models/token');

const authService = {
    /**
     * @param {string} identifier
     */
    findUserByUsernameOrEmail: async (identifier) => {
    // Mongoose query using the $or operator to check multiple fields
    return await User.findOne({
        $or: [
            { username: identifier }, 
            { email: identifier }
        ]
    });
},

    /** 
     * @param {string} username
     * @param {string} hashedPassword
     * @param {string} firstName
     * @param {string} lastName
     * @param {string} email
     */
    saveUser: async (username, email, hashedPassword, firstName, lastName) => {
        const newUser = new User({ username, email, password: hashedPassword, firstName, lastName });
        return await newUser.save();
    },
    saveRefreshToken: async (userId, token) => {
        // Delete any old refresh tokens for this user first (optional, but good for single session)
        await Token.deleteMany({ userId: userId });
        const newToken = new Token({ userId, refreshToken: token });
        return await newToken.save();
    },

    deleteRefreshToken: async (token) => {
        return await Token.deleteOne({ refreshToken: token });
    },

    findToken: async (token) => {
        return await Token.findOne({ refreshToken: token });
    }
};

module.exports = authService;