import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ProofUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  achievementId?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  badgeTokenId?: string | number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoAnchor?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  anchor?: boolean;
}

export class ProofUrlCreateDto extends ProofUploadDto {
  @ApiProperty({ example: "https://example.com/proof" })
  @IsString()
  @IsNotEmpty()
  sourceUrl!: string;
}
