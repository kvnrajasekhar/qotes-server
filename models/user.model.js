const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true
    },
    email: {
        type: String, 
        required: true, 
        unique: true
    },
    password: { 
        type: String, 
        required: true, 
        select: false 
    },
    firstName: {type:String},
    lastName: {type:String},
    bio: {type:String, default:''},
    avatarUrl: {type:String, default:''},
    stats: {
        followerCount: {type:Number, default:0},
        followingCount: {type:Number, default:0},
        quoteCount: {type:Number, default:0}
    },
    isBanned: {type:Boolean, default:false}
}, {
    timestamps: true //  Mongoose handles createdAt and updatedAt
});

const User = mongoose.model('User', UserSchema);
module.exports = User;