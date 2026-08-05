import { Controller, UseInterceptors, Get, Post, Patch, Delete, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { AuthGuard } from '../../shared/guards/auth.guard';

@Controller('quote')
@UseInterceptors(ResponseInterceptor)
@UseGuards(AuthGuard)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  async createQuote(@Request() req: any, @Body() body: any) {
    const {
      text,
      author,
      category,
      hashtags,
      taggedUsers,
      isRequote = false,
      parentQuoteId = null,
      isHiddenBySystem = false,
    } = body;

    if (!isRequote && !text) {
      throw new Error('Quote text is required');
    }

    if (isRequote && !parentQuoteId) {
      throw new Error('Parent quote ID is required for requote');
    }

    const newQuote = await this.quotesService.createQuote({
      text: text || '',
      author,
      category: category || '',
      hashtags: hashtags || [],
      taggedUsers: taggedUsers || [],
      creator: req.user.userId,
      isRequote,
      parentQuoteId,
      isHiddenBySystem,
    });

    if (!newQuote) {
      throw new Error('Failed to create quote');
    }

    return {
      success: true,
      statusCode: 201,
      message: isRequote ? 'Requote created successfully' : 'Quote created successfully',
      data: newQuote,
    };
  }

  @Get(':id')
  async getQuoteById(@Param('id') quoteId: string) {
    const quote = await this.quotesService.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Quote retrieved successfully',
      data: quote,
    };
  }

  @Get()
  async getAllQuotes() {
    const quotes = await this.quotesService.getAllQuotes();
    return {
      success: true,
      statusCode: 200,
      message: 'Quotes retrieved successfully',
      data: quotes,
    };
  }

  @Patch(':id')
  async updateQuote(@Param('id') quoteId: string, @Body() updateData: any) {
    const updatedQuote = await this.quotesService.updateQuote(quoteId, updateData);
    if (!updatedQuote) {
      throw new Error('Quote not found or update failed');
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Quote updated successfully',
      data: updatedQuote,
    };
  }

  @Delete(':id')
  async deleteQuote(@Param('id') quoteId: string) {
    const deletedQuote = await this.quotesService.deleteQuote(quoteId);
    if (!deletedQuote) {
      throw new Error('Quote not found or deletion failed');
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Quote deleted successfully',
      data: deletedQuote,
    };
  }

  @Get('me')
  async getQuotesByUser(@Request() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const userId = req.user.id;
    const userQuotes = await this.quotesService.getQuotesByUser({
      userId,
      cursor: cursor || null,
      limit: limit ? Number.parseInt(limit, 10) : 20,
    });
    if (!userQuotes) {
      throw new Error('No quotes found for this user');
    }
    return {
      success: true,
      statusCode: 200,
      message: 'User quotes retrieved successfully',
      data: userQuotes,
    };
  }
}
