import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

import { UserSchema } from "../../models/user.model";
import { QuoteSchema } from "../../models/quote.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "User", schema: UserSchema },
      { name: "Quote", schema: QuoteSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
