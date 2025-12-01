const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    userName: {type:String, required:true, unique:true},
    email: {type:String, required:true, unique:true},
    passwordHash: {type:String, required:true},
    firstName: {type:String},
    lastName: {type:String},
    bio: {type:String},
    stats: {
        followerCount: {type:Number, default:0},
        followingCount: {type:Number, default:0},
        quoteCount: {type:Number, default:0}
    },
    isBanned: {type:Boolean, default:false},
    createdAt: {type:Date, default:Date.now}
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
