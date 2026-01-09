import { IsEthereumAddress, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NonceRequestDto {
  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsEthereumAddress()
  address?: string;

  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;
}

export class LoginRequestDto {
  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsEthereumAddress()
  address?: string;

  @ApiPropertyOptional({ example: "0x0000000000000000000000000000000000000000" })
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;

  @ApiProperty({ example: "0x..." })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class VerifyRequestDto {
  @ApiProperty({ example: "0x0000000000000000000000000000000000000000" })
  @IsEthereumAddress()
  address!: string;

  @ApiProperty({ example: "0x..." })
  @IsString()
  @IsNotEmpty()
  signature!: string;

  @ApiProperty({ example: "nonce-value" })
  @IsString()
  @IsNotEmpty()
  nonce!: string;
}
