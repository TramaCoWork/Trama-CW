import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import type { SearchQuery } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchQuery) {
    return this.searchService.search(query);
  }
}
