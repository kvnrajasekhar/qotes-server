import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PreferencesController } from "./preferences.controller";
import { PreferencesService } from "./preferences.service";
import User, { UserSchema } from "../../models/user.model";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
