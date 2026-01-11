const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    repliesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    isEdited: { type: Boolean, default: false },
    updatedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
});

CommentSchema.index({ quote: 1, createdAt: -1 });          // feed comments
CommentSchema.index({ parentComment: 1, createdAt: -1 }); // replies
CommentSchema.index({ author: 1, createdAt: -1 });         // user comments


const Comment = mongoose.model('Comment', CommentSchema);
module.exports = Comment;