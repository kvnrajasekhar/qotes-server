const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    follower: {type:Schema.Types.ObjectId, ref:'User', required:true},
    following: {type:Schema.Types.ObjectId, ref:'User', required:true},
    createdAt: {type:Date, default:Date.now}
});
const Follow = mongoose.model('Follow', FollowSchema);
module.exports = Follow;
