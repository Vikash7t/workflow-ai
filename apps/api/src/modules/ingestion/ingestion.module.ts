import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { ExternalIngestionService } from "./external-ingestion.service";
import { ChannelRoutingService } from "./channel-routing.service";
import { SignatureVerificationService } from "./signature-verification.service";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [SearchModule],
  controllers: [IngestionController],
  providers: [
    ExternalIngestionService,
    ChannelRoutingService,
    SignatureVerificationService,
  ],
  exports: [ExternalIngestionService, ChannelRoutingService],
})
export class ExternalIngestionModule {}
