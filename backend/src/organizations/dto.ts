import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class OrgPrepareRequestDto {
  @ApiPropertyOptional({ example: "acme-org" })
  @IsOptional()
  @IsString()
  handle?: string;
}

export class OrgCreateRequestDto {
  @ApiProperty({ example: "acme-org" })
  @IsString()
  @IsNotEmpty()
  handle!: string;

  @ApiProperty({ example: "Acme Org" })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiPropertyOptional({ example: "We build on-chain credentials." })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "https://acme.org" })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: "PUBLIC" })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({ example: "0x..." })
  @IsOptional()
  @IsString()
  creationTxHash?: string;
}

export class OrgUpdateRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: "PUBLIC" })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class OrgInviteRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: "MEMBER" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  expiresInDays?: number;
}
