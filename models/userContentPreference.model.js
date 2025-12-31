import mongoose from "mongoose";

const userContentPreferenceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        type: {
            type: String,
            enum: ["QUOTE", "AUTHOR", "TAG"],
            required: true,
        },

        targetId: {
            type: String, 
            required: true,
        },

        reason: {
            type: String,
            enum: [
                "NOT_INTERESTED",   
                "SEEN_TOO_MUCH",    
                "SENSITIVE_TOPIC",  
                "OFFENSIVE",        
                "NOT_INSPIRATIONAL"
            ],
            default: "NOT_INTERESTED",
        },
    },
  { timestamps: true }
);

userContentPreferenceSchema.index(
  { userId: 1, type: 1, targetId: 1 },
  { unique: true }
);

userContentPreferenceSchema.index({ userId: 1 });

module.exports = mongoose.model(
    "UserContentPreference",
    userContentPreferenceSchema
);