import { Module } from "@nestjs/common";
import { IntelligenceController } from "./intelligence.controller";
import { DeliveryIntelligenceService } from "./delivery-intelligence.service";

@Module({
  controllers: [IntelligenceController],
  providers: [DeliveryIntelligenceService],
  exports: [DeliveryIntelligenceService],
})
export class IntelligenceModule {}
