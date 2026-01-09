import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorDetailDto {
  @ApiProperty({ example: "BAD_REQUEST" })
  code!: string;

  @ApiProperty({ example: "Request failed" })
  message!: string;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ required: false, example: "/orgs" })
  path?: string;

  @ApiProperty({ required: false, nullable: true, example: "f44b50ef-22a2-4c9b-8a8b-3d3f5b0c7c2b" })
  requestId?: string | null;

  @ApiProperty({ example: "2026-01-08T12:12:47.821Z" })
  timestamp!: string;

  @ApiProperty({ required: false })
  details?: unknown;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorDetailDto })
  error!: ApiErrorDetailDto;
}
