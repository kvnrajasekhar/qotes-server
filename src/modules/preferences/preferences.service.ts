import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import User, { IUser } from "../../models/user.model";

@Injectable()
export class PreferencesService {
  constructor(@InjectModel(User.name) private userModel: Model<IUser>) {}
}
