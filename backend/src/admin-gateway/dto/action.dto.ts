import { IsObject, IsString, MinLength } from "class-validator";

export class AdminActionRequestDto {
  @IsString()
  @MinLength(1)
  action!: string;

  @IsObject()
  payload!: Record<string, any>;
}

export class AdminExecuteRequestDto {
  @IsString()
  @MinLength(1)
  intentId!: string;

  @IsString()
  @MinLength(1)
  confirmPhrase!: string;

  @IsObject()
  payload!: Record<string, any>;
}
