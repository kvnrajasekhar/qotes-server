const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserBlockSchema = new Schema({
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });



UserBlockSchema.index(
  { blocker: 1, blocked: 1 },
  { unique: true }
);


UserBlockSchema.index({ blocker: 1 });
UserBlockSchema.index({ blocked: 1 });

const UserBlock = mongoose.model("UserBlock", UserBlockSchema);
module.exports = UserBlock;