const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    follower: {type:Schema.Types.ObjectId, ref:'User', required:true},
    following: {type:Schema.Types.ObjectId, ref:'User', required:true},
    createdAt: {type:Date, default:Date.now}
});

// For getFollowers
FollowSchema.index({ following: 1, _id: -1 });

// For getFollowing
FollowSchema.index({ follower: 1, _id: -1 });

// For preventing duplicate follows (Critical)
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model('Follow', FollowSchema);
module.exports = Follow;
