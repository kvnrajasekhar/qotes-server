import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { PreferencesController } from "./preferences.controller";
import { PreferencesService } from "./preferences.service";
import UserContentPreference, { userContentPreferenceSchema } from "../../models/userContentPreference.model";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: UserContentPreference.name, schema: userContentPreferenceSchema }]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule { }
