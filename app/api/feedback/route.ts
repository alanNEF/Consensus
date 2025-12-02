import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // Validate the message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long' },
        { status: 400 }
      );
    }

    // Insert feedback into database
    // Using type assertion to bypass TypeScript until table is added to types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('feedback')
      .insert({
        message: message.trim()
      });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Feedback submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}