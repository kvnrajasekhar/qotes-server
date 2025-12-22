const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    _id: {type:Schema.Types.ObjectId, auto:true},
    quote: {type:Schema.Types.ObjectId, ref:'Quote', required:true},
    author: {type:Schema.Types.ObjectId, ref:'User', required:true},
    text: {type:String, required:true},
    likes: [{type:Schema.Types.ObjectId, ref:'User'}],
    parentComment: {type:Schema.Types.ObjectId, ref:'Comment', default:null},
    repliesCount: {type:Number, default:0},
    createdAt: {type:Date, default:Date.now}
});

const Comment = mongoose.model('Comment', CommentSchema);
module.exports = Comment;