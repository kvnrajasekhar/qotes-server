import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import UserContentPreference, { IUserContentPreference } from '../../models/userContentPreference.model';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(UserContentPreference.name) private preferenceModel: Model<IUserContentPreference>,
  ) {}

  async savePreference({ userId, type, targetId, reason }: { userId: string; type: string; targetId: string; reason: string }) {
    if (!['QUOTE', 'AUTHOR', 'TAG'].includes(type)) {
      throw new BadRequestException('Invalid type');
    }

    return await this.preferenceModel.updateOne(
      { userId, type, targetId },
      {
        $set: { reason, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }
}
