import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import Collection, { ICollection } from "../../models/collections.model";
import CollectionItem, {
  ICollectionItem,
} from "../../models/collectionItem.model";
import Quote, { IQuote } from "../../models/quote.model";
import {
  buildCursorQuery,
  processPaginatedResults,
} from "../../shared/utils/cursor.util";

@Injectable()
export class CollectionsService {
  constructor(
    @InjectModel(Collection.name) private collectionModel: Model<ICollection>,
    @InjectModel(CollectionItem.name)
    private collectionItemModel: Model<ICollectionItem>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
  ) {}

  async getUserCollections({
    userId,
    cursor = null,
    limit = 20,
  }: {
    userId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: any = { owner: userId };

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
    }

    const collections = await this.collectionModel
      .find(query)
      .select("name isPrivate isDefault createdAt")
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(collections, limit, ['createdAt']);

    return {
      collections: data,
      pagination,
    };
  }

  async getCollectionDetails({
    collectionId,
    cursor = null,
    limit = 20,
  }: {
    collectionId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: any = { collectionId };

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, 'addedAt', -1));
    }

    const items = await this.collectionItemModel
      .find(query)
      .sort({ addedAt: -1 })
      .limit(limit + 1)
      .populate({
        path: "quoteId",
        select: "text author category reactions likes saves requotes createdAt",
      })
      .lean();

    const { data, pagination } = processPaginatedResults(items, limit, ['addedAt']);

    return {
      items: data.map((i: any) => i.quoteId),
      pagination,
    };
  }

  async toggleSave(
    userId: string,
    quoteId: string,
    collectionId: string | null = null,
  ) {
    let targetCollectionId = collectionId;

    if (!targetCollectionId) {
      let defaultCollection = await this.collectionModel.findOne({
        owner: userId,
        isDefault: true,
      });
      if (!defaultCollection) {
        defaultCollection = await this.collectionModel.create({
          owner: userId,
          name: "Saved",
          isPrivate: true,
          isDefault: true,
        });
      }
      targetCollectionId = defaultCollection._id.toString();
    } else {
      const isOwner = await this.collectionModel.exists({
        _id: targetCollectionId,
        owner: userId,
      });
      if (!isOwner) throw new UnauthorizedException("Unauthorized");
    }

    const existing = await this.collectionItemModel.findOne({
      collectionId: targetCollectionId,
      quoteId,
    });

    if (existing) {
      await this.collectionItemModel.deleteOne({ _id: existing._id });
      await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { saves: -1 } });
      return { saved: false };
    }

    await this.collectionItemModel.create({
      collectionId: targetCollectionId,
      quoteId,
    });
    await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { saves: 1 } });

    return { saved: true };
  }
}
