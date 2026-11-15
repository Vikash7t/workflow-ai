import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SemanticSearchService } from "./semantic-search.service";
import { EmbeddingService } from "./embedding.service";

@Module({
  controllers: [SearchController],
  providers: [SemanticSearchService, EmbeddingService],
  exports: [SemanticSearchService, EmbeddingService],
})
export class SearchModule {}
