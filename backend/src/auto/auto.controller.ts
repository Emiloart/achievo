/**
 * HTTP controller for placeholder automation endpoints.
 * This controller exposes explicit non-implemented responses to avoid ambiguous behavior.
 */
import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";

@Controller("auto")
export class AutoController {
  @Get("queue")
  queue() {
    throw new HttpException("Not Implemented", HttpStatus.NOT_IMPLEMENTED);
  }
}
