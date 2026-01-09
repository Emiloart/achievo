import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UsernamePrepareOrderDto {
  @ApiProperty({ example: "ASK" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: "acme" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "1000000000000000000" })
  @IsOptional()
  @IsString()
  priceWei?: string;

  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsString()
  takerAddress?: string;

  @ApiPropertyOptional({ example: 1760000000 })
  @IsOptional()
  expiresAt?: string | number;

  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsString()
  makerAddress?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  nonce?: string | number;

  @ApiPropertyOptional({ example: "2" })
  @IsOptional()
  salt?: string | number;
}

export class UsernameCreateOrderDto {
  @ApiPropertyOptional({ example: "acme" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: { domain: {}, types: {}, message: {} } })
  typedData!: any;

  @ApiProperty({ example: "0x..." })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class UsernameCancelOrderDto {
  @ApiProperty({ example: "0x..." })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class UsernameSubmitTradeTxDto {
  @ApiProperty({ example: "0x..." })
  @IsString()
  @IsNotEmpty()
  txHash!: string;
}
