import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";
import Collection, { CollectionSchema } from "../../models/collections.model";
import CollectionItem, {
  CollectionItemSchema,
} from "../../models/collectionItem.model";
import Quote, { QuoteSchema } from "../../models/quote.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Collection.name, schema: CollectionSchema },
      { name: CollectionItem.name, schema: CollectionItemSchema },
      { name: Quote.name, schema: QuoteSchema },
    ]),
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
